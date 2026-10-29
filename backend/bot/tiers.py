import asyncio
import logging

from aiogram import Bot
from aiogram.exceptions import TelegramBadRequest, TelegramRetryAfter
from aiogram.types import ChatMember

from app.config import settings
from app.services.subscription import TIER_RANK

log = logging.getLogger("bot.tiers")

_MEMBER = {"creator", "administrator", "member"}


def tier_chats() -> dict[int, str]:
    """chat_id закрытой группы/канала → тариф, который она даёт."""
    pairs = {
        settings.standard_chat_id: "standard",
        settings.pro_chat_id: "pro",
        settings.premium_chat_id: "premium",
    }
    return {chat_id: tier for chat_id, tier in pairs.items() if chat_id is not None}


def is_member_status(member: ChatMember) -> bool:
    if member.status in _MEMBER:
        return True
    return member.status == "restricted" and bool(getattr(member, "is_member", False))


async def is_member(bot: Bot, chat_id: int, user_id: int) -> bool:
    for _ in range(3):
        try:
            return is_member_status(await bot.get_chat_member(chat_id, user_id))
        except TelegramRetryAfter as e:
            await asyncio.sleep(e.retry_after + 1)
        except TelegramBadRequest as e:
            if "user not found" in str(e).lower() or "participant" in str(e).lower():
                return False
            raise  # «chat not found», «not enough rights» — ошибка настройки, а не «не участник»
    raise RuntimeError("Telegram rate limit")


async def resolve_tier(bot: Bot, user_id: int, known: dict[int, bool] | None = None) -> str:
    """Высший тариф, группа которого содержит пользователя. known — уже известное состояние из события."""
    known = known or {}
    for chat_id, tier in sorted(tier_chats().items(), key=lambda kv: -TIER_RANK[kv[1]]):
        member = known[chat_id] if chat_id in known else await is_member(bot, chat_id, user_id)
        if member:
            return tier
    return "none"
