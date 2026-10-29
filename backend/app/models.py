from datetime import date, datetime, timezone

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, LargeBinary, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def today_utc() -> date:
    return utcnow().date()


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    telegram_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, index=True, nullable=True)
    telegram_username: Mapped[str | None] = mapped_column(String(64))
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    has_custom_password: Mapped[bool] = mapped_column(default=False)
    # временный пароль уже отправлен в чат (показываем его только один раз)
    credentials_sent: Mapped[bool] = mapped_column(default=False)
    avatar_data: Mapped[bytes | None] = mapped_column(LargeBinary, deferred=True)
    avatar_mime: Mapped[str | None] = mapped_column(String(32))
    avatar_version: Mapped[int] = mapped_column(default=0)

    # none | standard | pro | premium
    tier: Mapped[str] = mapped_column(String(16), default="none")
    # active | inactive
    subscription_status: Mapped[str] = mapped_column(String(16), default="inactive")
    # True — тариф выставлен вручную админом, бот его не трогает
    tier_locked: Mapped[bool] = mapped_column(default=False)
    is_admin: Mapped[bool] = mapped_column(default=False)
    # owner | curator | member
    role: Mapped[str] = mapped_column(String(16), default="member")
    is_blocked: Mapped[bool] = mapped_column(default=False)
    blocked_reason: Mapped[str | None] = mapped_column(String(200))
    language: Mapped[str] = mapped_column(String(8), default="ru")
    freeze_count: Mapped[int] = mapped_column(Integer, default=0)
    referral_code: Mapped[str | None] = mapped_column(String(16), unique=True, index=True)
    invited_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuthSession(Base):
    """Одноразовая сессия входа через Telegram deep link."""

    __tablename__ = "auth_sessions"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)  # уходит в t.me/bot?start=<token>
    nonce_hash: Mapped[str] = mapped_column(String(64))  # привязка к браузеру, который начал вход
    login_code_hash: Mapped[str | None] = mapped_column(String(64), index=True)  # код из ссылки в чате с ботом
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    confirmed: Mapped[bool] = mapped_column(default=False)
    used: Mapped[bool] = mapped_column(default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Habit(Base):
    __tablename__ = "habits"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    icon: Mapped[str] = mapped_column(String(24), default="spark")
    created_on: Mapped[date] = mapped_column(Date)
    archived: Mapped[bool] = mapped_column(default=False)


class HabitLog(Base):
    __tablename__ = "habit_logs"
    __table_args__ = (UniqueConstraint("habit_id", "day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    habit_id: Mapped[int] = mapped_column(ForeignKey("habits.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    title: Mapped[str] = mapped_column(String(200))
    tag: Mapped[str | None] = mapped_column(String(40))
    due_time: Mapped[str | None] = mapped_column(String(8))
    done: Mapped[bool] = mapped_column(default=False)


class DayClose(Base):
    """Закрытый день: все задачи на дату выполнены. Источник серии и огонька."""

    __tablename__ = "day_closes"
    __table_args__ = (UniqueConstraint("user_id", "day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    tasks_total: Mapped[int] = mapped_column(Integer, default=0)
    tasks_done: Mapped[int] = mapped_column(Integer, default=0)
    habits_total: Mapped[int] = mapped_column(Integer, default=0)
    habits_done: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120), default="")
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    sent_to_telegram: Mapped[bool] = mapped_column(default=False)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text, default="")
    kind: Mapped[str] = mapped_column(String(24), default="info")
    read: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ActionLog(Base):
    __tablename__ = "action_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    actor_name: Mapped[str] = mapped_column(String(64), default="system")
    level: Mapped[str] = mapped_column(String(16), default="info")
    action: Mapped[str] = mapped_column(String(64))
    message: Mapped[str] = mapped_column(String(400), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class Invite(Base):
    __tablename__ = "invites"

    id: Mapped[int] = mapped_column(primary_key=True)
    inviter_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    invited_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    code: Mapped[str] = mapped_column(String(16))
    credited: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Marathon(Base):
    __tablename__ = "marathons"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    starts_on: Mapped[date] = mapped_column(Date)
    ends_on: Mapped[date] = mapped_column(Date)
    premium_only: Mapped[bool] = mapped_column(default=False)
    is_published: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class MarathonTask(Base):
    __tablename__ = "marathon_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    marathon_id: Mapped[int] = mapped_column(ForeignKey("marathons.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(default=0)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    due_on: Mapped[date | None] = mapped_column(Date)


class MarathonMember(Base):
    __tablename__ = "marathon_members"

    marathon_id: Mapped[int] = mapped_column(ForeignKey("marathons.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)


class MarathonReport(Base):
    __tablename__ = "marathon_reports"
    __table_args__ = (UniqueConstraint("task_id", "user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("marathon_tasks.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text, default="")
    image_data: Mapped[bytes | None] = mapped_column(LargeBinary, deferred=True)
    image_mime: Mapped[str | None] = mapped_column(String(32))
    # pending | approved | rejected
    status: Mapped[str] = mapped_column(String(16), default="pending")
    review_comment: Mapped[str | None] = mapped_column(String(400))
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    marathon_id: Mapped[int] = mapped_column(ForeignKey("marathons.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text, default="")
    image_data: Mapped[bytes | None] = mapped_column(LargeBinary, deferred=True)
    image_mime: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
