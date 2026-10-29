import asyncio
import secrets

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import User, utcnow
from app.security import hash_password
from app.services.subscription import apply_tier


async def _unique_username(db: AsyncSession) -> str:
    for _ in range(10):
        name = f"user_{secrets.randbelow(10**6):06d}"
        if not await db.scalar(select(User.id).where(User.username == name)):
            return name
    return f"user_{secrets.token_hex(4)}"


async def get_or_create_user(db: AsyncSession, telegram_id: int, telegram_username: str | None = None) -> tuple[User, bool]:
    """Находит пользователя по telegram_id или создаёт нового с временным ником и случайным паролем."""
    user = await db.scalar(select(User).where(User.telegram_id == telegram_id))
    created = False
    if user is None:
        # случайный пароль: пользователь входит через Telegram, пароль можно задать позже в настройках
        pwd_hash = await asyncio.to_thread(hash_password, secrets.token_urlsafe(16))
        user = User(
            telegram_id=telegram_id,
            username=await _unique_username(db),
            password_hash=pwd_hash,
            is_admin=telegram_id in settings.admin_ids,
            role="owner" if telegram_id in settings.admin_ids else "member",
            referral_code=secrets.token_hex(3).upper(),
        )
        db.add(user)
        try:
            await db.flush()
            created = True
        except IntegrityError:  # параллельный /start создал запись раньше
            await db.rollback()
            user = await db.scalar(select(User).where(User.telegram_id == telegram_id))
            if user is None:
                raise
    if telegram_id in settings.admin_ids and not user.is_admin:
        user.is_admin = True
        user.role = "owner"
    if telegram_username and user.telegram_username != telegram_username:
        user.telegram_username = telegram_username
    if not user.referral_code:
        user.referral_code = secrets.token_hex(3).upper()
    user.last_seen_at = utcnow()
    return user, created


async def sync_tier(db: AsyncSession, telegram_id: int, telegram_username: str | None, tier: str) -> tuple[str, str]:
    """Записывает тариф пользователя (создаёт запись, если нужно). Возвращает (прежний, новый)."""
    user, _ = await get_or_create_user(db, telegram_id, telegram_username)
    previous = user.tier
    if not user.tier_locked:
        apply_tier(user, tier)
    await db.commit()
    return previous, user.tier
