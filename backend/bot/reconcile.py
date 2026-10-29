import asyncio
import logging

from aiogram import Bot
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.models import User
from app.services.users import sync_tier
from bot.tiers import resolve_tier, tier_chats

log = logging.getLogger("bot.reconcile")


async def reconcile_once(bot: Bot) -> None:
    """Страховка: если событие выхода из группы пропущено (бот был offline), снимаем доступ при сверке."""
    if not tier_chats():
        return
    async with SessionLocal() as db:
        rows = (
            await db.execute(
                select(User.telegram_id, User.telegram_username, User.tier).where(
                    User.subscription_status == "active", User.tier_locked == False  # noqa: E712
                )
            )
        ).all()
    changed = 0
    for telegram_id, username, current in rows:
        try:
            tier = await resolve_tier(bot, telegram_id)
        except Exception:  # noqa: BLE001 — при сбое Telegram НЕ понижаем тариф
            log.warning("reconcile: skip %s", telegram_id, exc_info=True)
            continue
        if tier != current:
            async with SessionLocal() as db:
                await sync_tier(db, telegram_id, username, tier)
            changed += 1
            log.info("reconcile: %s %s → %s", telegram_id, current, tier)
        await asyncio.sleep(0.1)
    log.info("reconcile done: checked %s, changed %s", len(rows), changed)


async def reconcile_loop(bot: Bot) -> None:
    await asyncio.sleep(60)
    while True:
        try:
            await reconcile_once(bot)
        except Exception:  # noqa: BLE001
            log.exception("reconcile failed")
        await asyncio.sleep(max(settings.reconcile_interval_hours, 0.1) * 3600)
