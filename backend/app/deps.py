import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import User, utcnow
from app.security import decode_access_token
from app.services.subscription import has_access

SESSION_COOKIE = "lvs_session"
NONCE_COOKIE = "lvs_nonce"


async def get_session_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    """Пользователь по cookie без проверки блокировки: нужен /me для экрана блокировки."""
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(401, "unauthorized")
    try:
        user_id = decode_access_token(token)
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(401, "unauthorized")
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(401, "unauthorized")
    # Реальный DAU/WAU: отмечаем активность не чаще раза в 10 минут.
    now = utcnow()
    if user.last_seen_at is None or (now - user.last_seen_at).total_seconds() > 600:
        user.last_seen_at = now
        await db.commit()
    return user


async def get_current_user(user: User = Depends(get_session_user)) -> User:
    if user.is_blocked:
        raise HTTPException(403, "blocked")
    return user


async def require_subscriber(user: User = Depends(get_current_user)) -> User:
    """Статус подписки проверяется по базе на КАЖДЫЙ запрос — бот меняет его мгновенно."""
    if not has_access(user):
        raise HTTPException(402, "subscription_inactive")
    return user


def is_owner(user: User) -> bool:
    """Владелец — единственная роль с доступом к админ-панели."""
    return user.role == "owner"


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Админка доступна только владельцу (куратор работает с заданиями марафонов)."""
    if not is_owner(user):
        raise HTTPException(403, "forbidden")
    return user


async def require_curator(user: User = Depends(get_current_user)) -> User:
    if not (is_owner(user) or user.role == "curator"):
        raise HTTPException(403, "forbidden")
    return user
