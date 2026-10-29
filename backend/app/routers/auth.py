import asyncio
import hmac
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.deps import NONCE_COOKIE, SESSION_COOKIE
from app.models import AuthSession, Invite, Notification, User, utcnow
from app.schemas import ExchangeIn, PasswordLoginIn, RegisterIn
from app.security import (
    RateLimiter,
    create_access_token,
    generate_password,
    hash_password,
    normalize_code,
    sha256_hex,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])
login_limiter = RateLimiter(limit=10, window_seconds=900)
session_limiter = RateLimiter(limit=60, window_seconds=600)
forgot_limiter = RateLimiter(limit=3, window_seconds=3600)


def _set_cookie(response: Response, name: str, value: str, max_age: int) -> None:
    response.set_cookie(name, value, max_age=max_age, httponly=True, secure=settings.cookie_secure, samesite="lax", path="/")


def _start_session(response: Response, user_id: int) -> None:
    _set_cookie(response, SESSION_COOKIE, create_access_token(user_id), settings.jwt_ttl_days * 86400)


def _new_referral_code(username: str) -> str:
    return f"{username[:6].upper()}{secrets.token_hex(2).upper()}"


@router.post("/register", status_code=201)
async def register(body: RegisterIn, response: Response, db: AsyncSession = Depends(get_db)):
    """Классическая регистрация: email + пароль. Ник — публичный адрес профиля."""
    email = body.email.lower().strip()
    username = body.username.strip()
    ip = "register"
    if not login_limiter.hit(f"{ip}:{email}"):
        raise HTTPException(429, "too_many_requests")

    if await db.scalar(select(User.id).where(func.lower(User.username) == username.lower())):
        raise HTTPException(409, "username_taken")
    if await db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise HTTPException(409, "email_taken")

    code = _new_referral_code(username)
    while await db.scalar(select(User.id).where(User.referral_code == code)):
        code = _new_referral_code(username)

    pwd_hash = await asyncio.to_thread(hash_password, body.password)
    user = User(
        telegram_id=None,
        username=username,
        email=email,
        password_hash=pwd_hash,
        has_custom_password=True,
        language=body.language,
        referral_code=code,
        role="member",
        last_seen_at=utcnow(),
    )
    db.add(user)
    await db.flush()

    # Реферал: принимаем и чистый код, и формат «ник-код» из ссылки.
    raw = (body.referral_code or "").strip()
    inviter = None
    if raw:
        candidate = raw.rsplit("-", 1)[-1].upper()
        inviter = await db.scalar(
            select(User).where(
                or_(
                    func.upper(User.referral_code) == raw.upper(),
                    func.upper(User.referral_code) == candidate,
                ),
                User.id != user.id,
            )
        )
    if inviter is not None:
        user.invited_by = inviter.id
        # Бонус пригласившему: заморозка серии и месяц Pro.
        inviter.freeze_count = (inviter.freeze_count or 0) + 1
        if inviter.tier in ("none", "standard") and not inviter.tier_locked:
            inviter.tier = "pro"
            inviter.subscription_status = "active"
        db.add(Invite(inviter_id=inviter.id, invited_id=user.id, code=raw.upper(), credited=True))
        db.add(
            Notification(
                user_id=inviter.id,
                title="Друг присоединился",
                body=f"@{username} зарегистрировался по вашей ссылке. Начислены заморозка и Pro.",
                kind="referral",
            )
        )
    await db.commit()
    _start_session(response, user.id)
    return {"ok": True, "referral_code": code, "invited": inviter is not None}


@router.post("/session")
async def create_session(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Шаг 1: сайт получает токен для deep link и секрет, привязанный к этому браузеру."""
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "?")).split(",")[0].strip()
    if not session_limiter.hit(ip):
        raise HTTPException(429, "too_many_requests")
    ttl = settings.auth_session_ttl_minutes * 60
    await db.execute(delete(AuthSession).where(AuthSession.expires_at < utcnow() - timedelta(days=1)))
    token = secrets.token_urlsafe(24)  # 32 символа, укладывается в лимит start-параметра Telegram (64)
    nonce = secrets.token_urlsafe(32)
    db.add(AuthSession(token=token, nonce_hash=sha256_hex(nonce), expires_at=utcnow() + timedelta(seconds=ttl)))
    await db.commit()
    _set_cookie(response, NONCE_COOKIE, nonce, ttl)
    return {"token": token, "bot_url": f"https://t.me/{settings.bot_username}?start={token}", "expires_in": ttl}


def _nonce_matches(request: Request, s: AuthSession) -> bool:
    nonce = request.cookies.get(NONCE_COOKIE)
    return bool(nonce) and hmac.compare_digest(sha256_hex(nonce), s.nonce_hash)


@router.get("/session/{token}")
async def session_status(token: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Шаг 2: страница входа опрашивает, подтвердил ли пользователь вход в боте."""
    s = await db.get(AuthSession, token[:64])
    if s is None or s.used or s.expires_at < utcnow() or not _nonce_matches(request, s):
        return {"status": "expired"}
    return {"status": "confirmed" if s.confirmed else "pending"}


@router.post("/exchange")
async def exchange(body: ExchangeIn, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Шаг 3: обмен подтверждённой сессии на JWT-cookie.

    Работает двумя путями:
    - token + cookie-секрет: вкладка, где пользователь нажал «Войти» (автовход после подтверждения в боте);
    - code из ссылки, которую бот прислал в личный чат: вход в любом браузере.
    Токен из deep link сам по себе войти НЕ позволяет — это защита от подмены сессии.
    """
    s: AuthSession | None = None
    if body.code:
        s = await db.scalar(
            select(AuthSession).where(AuthSession.login_code_hash == sha256_hex(normalize_code(body.code)))
        )
    elif body.token:
        s = await db.get(AuthSession, body.token)
        if s is not None and not _nonce_matches(request, s):
            s = None
    if s is None or s.used or not s.confirmed or s.user_id is None or s.expires_at < utcnow():
        raise HTTPException(400, "invalid_or_expired")

    user = await db.get(User, s.user_id)
    if user is None or user.is_blocked:
        raise HTTPException(403, "blocked")

    # атомарно «сжигаем» сессию: второй параллельный запрос получит rowcount = 0
    res = await db.execute(
        update(AuthSession).where(AuthSession.token == s.token, AuthSession.used == False).values(used=True)  # noqa: E712
    )
    await db.commit()
    if res.rowcount != 1:
        raise HTTPException(400, "invalid_or_expired")

    _start_session(response, user.id)
    response.delete_cookie(NONCE_COOKIE, path="/")
    return {"ok": True}


@router.post("/login")
async def password_login(body: PasswordLoginIn, response: Response, db: AsyncSession = Depends(get_db)):
    """Вход по email/нику и паролю — только для тех, кто задал пароль в настройках."""
    ident = body.identifier.strip().lower()
    if not login_limiter.hit(ident):
        raise HTTPException(429, "too_many_requests")
    user = await db.scalar(select(User).where(or_(func.lower(User.email) == ident, func.lower(User.username) == ident)))
    ok = (
        user is not None
        and user.has_custom_password
        and await asyncio.to_thread(verify_password, body.password, user.password_hash)
    )
    if not ok or user is None:
        raise HTTPException(401, "wrong_credentials")
    if user.is_blocked:
        raise HTTPException(403, "blocked")
    user.last_seen_at = utcnow()
    await db.commit()
    _start_session(response, user.id)
    return {"ok": True}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@router.post("/forgot-password")
async def forgot_password(body: PasswordLoginIn, db: AsyncSession = Depends(get_db)):
    """Сброс пароля: помечает пользователя, чтобы при следующем /start в боте
    выдали новый временный пароль и ник."""
    ident = body.identifier.strip().lower()
    if not forgot_limiter.hit(ident):
        raise HTTPException(429, "too_many_requests")
    user = await db.scalar(
        select(User).where(or_(func.lower(User.email) == ident, func.lower(User.username) == ident))
    )
    if user is None:
        # Не раскрываем, существует ли пользователь
        return {"ok": True}
    user.credentials_sent = False
    await db.commit()
    return {"ok": True}
