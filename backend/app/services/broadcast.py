import asyncio
import logging

import httpx
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.models import Post, User
from app.services.subscription import CABINET_MIN_RANK, TIER_RANK

log = logging.getLogger("broadcast")


async def broadcast_post(post_id: int) -> None:
    """Рассылает пост подписчикам Pro/Премиум через Bot API. Запускается фоновой задачей."""
    if not settings.bot_token:
        log.warning("BOT_TOKEN не задан — рассылка пропущена")
        return
    async with SessionLocal() as db:
        post = await db.get(Post, post_id)
        if post is None:
            return
        rows = await db.execute(
            select(User.telegram_id, User.tier).where(User.subscription_status == "active", User.is_blocked == False)  # noqa: E712
        )
        recipients = [tg for tg, tier in rows.all() if TIER_RANK.get(tier, 0) >= CABINET_MIN_RANK]
        text = f"{post.title}\n\n{post.body}"[:4096]

        sent = 0
        url = f"https://api.telegram.org/bot{settings.bot_token}/sendMessage"
        async with httpx.AsyncClient(timeout=15, proxy=settings.proxy or None) as client:
            for chat_id in recipients:
                for _attempt in range(2):
                    try:
                        r = await client.post(url, json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True})
                    except httpx.HTTPError:
                        break
                    if r.status_code == 200:
                        sent += 1
                        break
                    if r.status_code == 429:
                        await asyncio.sleep(int(r.json().get("parameters", {}).get("retry_after", 1)) + 1)
                        continue
                    break  # 403 (бот заблокирован) и прочее — пропускаем
                await asyncio.sleep(0.05)  # ~20 сообщений/с, лимит Telegram — 30

        # sent_count — это доставка в колокольчик (in-app), её не перезаписываем.
        # Флаг показывает, что дубль ушёл в Telegram.
        post.sent_to_telegram = True
        await db.commit()
        log.info("post %s sent to %s/%s telegram users", post_id, sent, len(recipients))
