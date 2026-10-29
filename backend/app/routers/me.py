import asyncio

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user, get_session_user
from app.models import Invite, Notification, User
from app.schemas import PasswordChangeIn, ProfilePatch
from app.security import hash_password, verify_password
from app.services.subscription import has_access

router = APIRouter(tags=["me"])

MAX_AVATAR = 1_000_000


def me_out(u: User) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "avatar_url": f"/api/me/avatar?v={u.avatar_version}" if u.avatar_version else None,
        "tier": u.tier,
        "subscription_status": u.subscription_status,
        "has_access": has_access(u),
        "is_admin": u.is_admin,
        "role": u.role or ("owner" if u.is_admin else "member"),
        "is_blocked": u.is_blocked,
        "blocked_reason": u.blocked_reason,
        "language": u.language or "ru",
        "freeze_count": u.freeze_count or 0,
        "referral_code": u.referral_code,
        "has_custom_password": u.has_custom_password,
        "created_at": u.created_at,
    }


@router.get("/me")
async def get_me(user: User = Depends(get_session_user)):
    # доступен и без подписки и даже заблокированному: фронтенду нужен статус,
    # чтобы показать paywall или экран блокировки вместо белого экрана.
    return me_out(user)


@router.get("/me/notifications")
async def list_notifications(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.scalars(
            select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(30)
        )
    ).all()
    return [
        {
            "id": n.id,
            "title": n.title,
            "body": n.body,
            "kind": n.kind,
            "read": n.read,
            "created_at": n.created_at,
        }
        for n in rows
    ]


@router.post("/me/notifications/read")
async def read_notifications(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(Notification).where(Notification.user_id == user.id, Notification.read == False))).all()  # noqa: E712
    for row in rows:
        row.read = True
    await db.commit()
    return {"ok": True, "read": len(rows)}


@router.get("/me/referrals")
async def my_referrals(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Invite, User.username, User.created_at)
            .join(User, User.id == Invite.invited_id)
            .where(Invite.inviter_id == user.id)
            .order_by(Invite.created_at.desc())
            .limit(100)
        )
    ).all()
    return {
        "code": user.referral_code,
        "link": f"https://lvs.app/invite/{user.username}-{(user.referral_code or '').lower()}",
        "invited": [
            {"username": name, "joined_at": joined, "credited": inv.credited}
            for inv, name, joined in rows
        ],
        "freeze_count": user.freeze_count or 0,
    }


@router.patch("/me")
async def patch_me(body: ProfilePatch, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if "username" in body.model_fields_set and body.username:
        taken = await db.scalar(select(User.id).where(User.username == body.username, User.id != user.id))
        if taken:
            raise HTTPException(409, "username_taken")
        user.username = body.username
    if "email" in body.model_fields_set and body.email:
        email = body.email.lower()
        taken = await db.scalar(select(User.id).where(User.email == email, User.id != user.id))
        if taken:
            raise HTTPException(409, "email_taken")
        user.email = email
    if "language" in body.model_fields_set and body.language:
        user.language = body.language
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "already_taken")
    return me_out(user)


@router.delete("/me")
async def delete_me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Полное удаление аккаунта и связанных данных (каскадом по внешним ключам)."""
    await db.delete(user)
    await db.commit()
    return {"ok": True}


@router.post("/me/password")
async def change_password(body: PasswordChangeIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.has_custom_password:
        ok = body.current_password and await asyncio.to_thread(verify_password, body.current_password, user.password_hash)
        if not ok:
            raise HTTPException(403, "wrong_password")
    user.password_hash = await asyncio.to_thread(hash_password, body.new_password)
    user.has_custom_password = True
    await db.commit()
    return {"ok": True}


def _sniff_image(data: bytes) -> str | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


@router.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    data = await file.read(MAX_AVATAR + 1)
    if len(data) > MAX_AVATAR:
        raise HTTPException(413, "file_too_large")
    mime = _sniff_image(data)  # тип определяем по содержимому, а не по заголовку клиента
    if mime is None:
        raise HTTPException(415, "unsupported_image")
    user.avatar_data = data
    user.avatar_mime = mime
    user.avatar_version += 1
    await db.commit()
    return me_out(user)


@router.get("/me/avatar")
async def get_avatar(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(User.avatar_data, User.avatar_mime).where(User.id == user.id))).first()
    if not row or not row[0]:
        raise HTTPException(404, "no_avatar")
    return Response(row[0], media_type=row[1], headers={"Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff"})
