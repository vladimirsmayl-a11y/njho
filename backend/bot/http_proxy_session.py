"""HTTP-прокси для Bot API.

aiogram из коробки умеет только SOCKS-прокси (через aiohttp-socks),
а обычный HTTP/HTTPS-прокси (как у VPN-клиентов) не поддерживает.
Этот класс добавляет параметр proxy в каждый запрос aiohttp.

Прокси можно передать строкой или функцией — функция вызывается перед
каждым запросом, чтобы подхватить новый порт после перезапуска VPN-клиента.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import TYPE_CHECKING, cast

from aiohttp import ClientError
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.exceptions import TelegramNetworkError
from aiogram.methods.base import TelegramType

if TYPE_CHECKING:
    from aiogram.client.bot import Bot
    from aiogram.methods import TelegramMethod

ProxyProvider = str | Callable[[], str]


class HttpProxySession(AiohttpSession):
    def __init__(self, proxy: ProxyProvider, **kwargs) -> None:
        super().__init__(**kwargs)
        self._proxy_provider = proxy

    def _current_proxy(self) -> str | None:
        proxy = self._proxy_provider() if callable(self._proxy_provider) else self._proxy_provider
        return proxy or None

    async def make_request(
        self,
        bot: "Bot",
        method: "TelegramMethod[TelegramType]",
        timeout: int | None = None,
    ) -> TelegramType:
        session = await self.create_session()

        url = self.api.api_url(token=bot.token, method=method.__api_method__)
        form = self.build_form_data(bot=bot, method=method)

        try:
            async with session.post(
                url,
                data=form,
                proxy=self._current_proxy(),
                timeout=self.timeout if timeout is None else timeout,
            ) as resp:
                raw_result = await resp.text()
        except asyncio.TimeoutError as e:
            raise TelegramNetworkError(method=method, message="Request timeout error") from e
        except ClientError as e:
            raise TelegramNetworkError(method=method, message=f"{type(e).__name__}: {e}") from e

        response = self.check_response(
            bot=bot,
            method=method,
            status_code=resp.status,
            content=raw_result,
        )
        return cast(TelegramType, response.result)
