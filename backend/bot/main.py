import asyncio
import logging

from aiogram import Bot, Dispatcher

from app.config import settings
from app.db import init_models
from bot.handlers import router
from bot.http_proxy_session import HttpProxySession
from bot.reconcile import reconcile_loop
from bot.tiers import tier_chats


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    if not settings.bot_token:
        raise SystemExit("BOT_TOKEN не задан")
    if not tier_chats():
        logging.warning("STANDARD/PRO/PREMIUM_CHAT_ID не заданы — отслеживание подписок отключено, работает только вход")

    await init_models()
    # Прокси берём из настроек при каждом запросе: порт VPN-клиента может меняться.
    session = HttpProxySession(lambda: settings.proxy)
    bot = Bot(settings.bot_token, session=session)
    dp = Dispatcher()
    dp.include_router(router)

    try:
        await bot.delete_webhook(drop_pending_updates=False)  # используем long polling
    except Exception:  # noqa: BLE001 — сеть может быть недоступна при старте, polling сам повторит попытки
        logging.warning("Не удалось снять webhook (сеть/прокси). Продолжаю в режиме polling.")
    reconcile = asyncio.create_task(reconcile_loop(bot))
    try:
        # chat_member приходит только если явно запрошен в allowed_updates
        await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
    finally:
        reconcile.cancel()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
