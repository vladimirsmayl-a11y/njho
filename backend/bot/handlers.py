import asyncio
import logging
import secrets
from datetime import datetime, timedelta, timezone

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import (
    ChatMemberUpdated,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
)
from sqlalchemy import select, update

from app.config import settings
from app.db import SessionLocal
from app.models import AuthSession, User, utcnow
from app.security import (
    generate_login_code,
    generate_password,
    hash_password,
    normalize_code,
    sha256_hex,
)
from app.services.subscription import TIER_LABEL, TIER_RANK
from app.services.users import get_or_create_user, sync_tier
from bot.tiers import is_member_status, resolve_tier, tier_chats

log = logging.getLogger("bot.handlers")
router = Router()

AUTH_BUTTON = "Авторизоваться на сайте"


def _is_public(url: str) -> bool:
    return url.startswith("https://")


def _button(text: str, url: str) -> InlineKeyboardMarkup | None:
    # Telegram принимает в кнопках только публичные https-ссылки,
    # поэтому при локальном запуске (http://localhost) кнопку не показываем.
    if not _is_public(url):
        return None
    return InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=text, url=url)]])


def _auth_keyboard() -> ReplyKeyboardMarkup:
    """Кнопка под полем ввода: работает и на локальном http, в отличие от inline-кнопок."""
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=AUTH_BUTTON)]],
        resize_keyboard=True,
        is_persistent=True,
    )


@router.message(CommandStart(), F.chat.type == "private")
async def on_start(message: Message, command: CommandObject, bot: Bot) -> None:
    tg = message.from_user
    if tg is None:
        return
    token = (command.args or "").strip()[:64]

    # 1. если пришли по ссылке с сайта — проверяем одноразовый токен
    session_ok = False
    if token:
        async with SessionLocal() as db:
            row = (
                await db.execute(
                    select(AuthSession.confirmed, AuthSession.used, AuthSession.expires_at).where(
                        AuthSession.token == token
                    )
                )
            ).first()
        session_ok = (
            row is not None
            and not row.confirmed
            and not row.used
            and row.expires_at >= datetime.now(timezone.utc)
        )

    # 2. находим или создаём профиль; временный пароль показываем ровно один раз
    password: str | None = None
    async with SessionLocal() as db:
        user, _created = await get_or_create_user(db, tg.id, tg.username)
        user_id, blocked, username = user.id, user.is_blocked, user.username
        if not user.credentials_sent:
            password = generate_password()
            user.password_hash = await asyncio.to_thread(hash_password, password)
            user.has_custom_password = True
            user.credentials_sent = True
        await db.commit()
    if blocked:
        await message.answer("Этот аккаунт заблокирован. Если это ошибка, напишите в поддержку.")
        return

    # 3. подтягиваем тариф по составу закрытых групп (на случай пропущенного события)
    if tier_chats():
        try:
            tier = await resolve_tier(bot, tg.id)
            async with SessionLocal() as db:
                await sync_tier(db, tg.id, tg.username, tier)
        except Exception:  # noqa: BLE001 — вход не должен ломаться из-за сбоя проверки групп
            log.exception("tier sync failed for %s", tg.id)

    # 4. подтверждаем сессию, открытую на сайте: страница входа войдёт сама
    if session_ok:
        async with SessionLocal() as db:
            await db.execute(
                update(AuthSession)
                .where(
                    AuthSession.token == token,
                    AuthSession.confirmed == False,  # noqa: E712
                    AuthSession.used == False,  # noqa: E712
                    AuthSession.expires_at > datetime.now(timezone.utc),
                )
                .values(user_id=user_id, confirmed=True)
            )
            await db.commit()

    # 5. отвечаем: новичку — логин и пароль, остальным — кнопка входа
    if password is not None:
        await message.answer(
            "Аккаунт создан.\n\n"
            f"Ник: {username}\n"
            f"Пароль: {password}\n\n"
            f"Войти: {settings.site}/login\n\n"
            "Пароль показывается один раз — сохраните его. "
            f"Дальше входить можно кнопкой «{AUTH_BUTTON}».",
            reply_markup=_auth_keyboard(),
        )
    else:
        await message.answer(
            "Вы уже зарегистрированы.\n\n"
            f"Ник: {username}\n\n"
            f"Нажмите «{AUTH_BUTTON}» — бот пришлёт код для входа.",
            reply_markup=_auth_keyboard(),
        )


@router.message(F.text == AUTH_BUTTON, F.chat.type == "private")
async def on_auth_button(message: Message) -> None:
    """Кнопка «Авторизоваться на сайте»: выдаём одноразовый код для входа."""
    tg = message.from_user
    if tg is None:
        return
    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(User.telegram_id == tg.id))
        if user is None:
            await message.answer("Сначала нажмите /start — создам аккаунт и пришлю пароль.")
            return
        if user.is_blocked:
            await message.answer("Этот аккаунт заблокирован. Если это ошибка, напишите в поддержку.")
            return
        code = generate_login_code()
        db.add(
            AuthSession(
                token=secrets.token_urlsafe(24),
                nonce_hash=sha256_hex(secrets.token_urlsafe(32)),
                confirmed=True,
                user_id=user.id,
                login_code_hash=sha256_hex(normalize_code(code)),
                expires_at=utcnow() + timedelta(minutes=10),
            )
        )
        await db.commit()

    await message.answer(
        f"Код для входа: {code}\n\n"
        f"Откройте {settings.site}/login и введите код в поле «Код из бота».\n"
        "Код действует 10 минут и срабатывает один раз.",
        reply_markup=_auth_keyboard(),
    )


@router.chat_member(F.chat.id.in_(set(tier_chats())))
async def on_chat_member(event: ChatMemberUpdated, bot: Bot) -> None:
    """Paywall добавил или удалил человека в закрытой группе/канале тарифа."""
    user = event.new_chat_member.user
    if user.is_bot:
        return
    was = is_member_status(event.old_chat_member)
    now = is_member_status(event.new_chat_member)
    if was == now:  # смена прав или заглушка, членство не изменилось
        return

    try:
        tier = await resolve_tier(bot, user.id, known={event.chat.id: now})
        async with SessionLocal() as db:
            previous, current = await sync_tier(db, user.id, user.username, tier)
    except Exception:  # noqa: BLE001
        log.exception("chat_member handling failed for %s", user.id)
        return
    log.info("user %s: %s → %s (chat %s, joined=%s)", user.id, previous, current, event.chat.id, now)

    # Приветствие — только Pro/Премиум при новой активации или повышении. Стандарт: бот молчит.
    if TIER_RANK[current] >= TIER_RANK["pro"] and TIER_RANK[current] > TIER_RANK.get(previous, 0):
        try:
            await bot.send_message(
                user.id,
                f"Добро пожаловать в ЛВС {TIER_LABEL[current]}! Твоя подписка активирована.\n"
                "Переходи в личный кабинет, настраивай трекеры и приступай к марафонам:"
                + ("" if _is_public(f"{settings.site}/dashboard") else f"\n\n{settings.site}/dashboard"),
                reply_markup=_button("Открыть личный кабинет", f"{settings.site}/dashboard"),
            )
        except TelegramAPIError as e:  # человек ещё не запускал бота — личное сообщение невозможно
            log.info("welcome DM to %s not delivered: %s", user.id, e)
