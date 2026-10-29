from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


# Мягкие миграции: проект живёт без Alembic, поэтому недостающие колонки
# добавляем идемпотентно при старте. Данные не теряются.
MIGRATIONS = (
    "ALTER TABLE users ALTER COLUMN telegram_id DROP NOT NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(16) DEFAULT 'member'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_reason VARCHAR(200)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(8) DEFAULT 'ru'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS freeze_count INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(16)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_referral_code ON users (referral_code)",
    "ALTER TABLE habits ADD COLUMN IF NOT EXISTS icon VARCHAR(24) DEFAULT 'spark'",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tag VARCHAR(40)",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time VARCHAR(8)",
    "ALTER TABLE marathon_reports ALTER COLUMN text DROP NOT NULL",
    "ALTER TABLE marathon_reports ADD COLUMN IF NOT EXISTS image_data BYTEA",
    "ALTER TABLE marathon_reports ADD COLUMN IF NOT EXISTS image_mime VARCHAR(32)",
    "ALTER TABLE marathon_reports ADD COLUMN IF NOT EXISTS status VARCHAR(16) DEFAULT 'pending'",
    "ALTER TABLE marathon_reports ADD COLUMN IF NOT EXISTS review_comment VARCHAR(400)",
    "ALTER TABLE marathon_reports ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL",
    "ALTER TABLE marathon_reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ",
    "CREATE INDEX IF NOT EXISTS ix_chat_messages_marathon_id ON chat_messages (marathon_id)",
    "CREATE INDEX IF NOT EXISTS ix_action_logs_created_at ON action_logs (created_at)",
)


async def init_models() -> None:
    from app import models  # noqa: F401  (регистрация таблиц)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for statement in MIGRATIONS:
            try:
                await conn.execute(text(statement))
            except Exception:  # noqa: BLE001 — отдельная миграция не должна ронять старт
                pass

        # Владелец — администратор из конфига; остальным админам оставляем куратора.
        await conn.execute(
            text(
                "UPDATE users SET role = 'owner' WHERE is_admin = TRUE AND (role IS NULL OR role = 'member')"
            )
        )
        # Коды приглашений для уже зарегистрированных пользователей.
        await conn.execute(
            text(
                "UPDATE users SET referral_code = upper(substr(md5(username || id::text), 1, 6)) "
                "WHERE referral_code IS NULL"
            )
        )
