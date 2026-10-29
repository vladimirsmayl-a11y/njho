from functools import cached_property

import os

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_ignore_empty=True)

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/lvs"
    jwt_secret: str = "change-me"
    jwt_ttl_days: int = 30
    site_url: str = "http://localhost:3000"
    cookie_secure: bool = True
    auth_session_ttl_minutes: int = 10
    cors_origins: str = ""

    bot_token: str = ""
    bot_username: str = "lvs_key_bot"
    admin_telegram_ids: str = ""
    # HTTP-прокси для запросов к api.telegram.org (например http://127.0.0.1:62520).
    # Нужен, если на машине включён VPN/прокси и прямой доступ к Telegram не работает.
    telegram_proxy: str = ""

    standard_chat_id: int | None = None
    pro_chat_id: int | None = None
    premium_chat_id: int | None = None
    reconcile_interval_hours: float = 6

    @field_validator("database_url")
    @classmethod
    def _async_driver(cls, v: str) -> str:
        # Railway/Render отдают postgres:// или postgresql:// — приводим к asyncpg
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+asyncpg://" + v[len(prefix):]
        return v

    @cached_property
    def admin_ids(self) -> set[int]:
        return {int(x) for x in self.admin_telegram_ids.replace(" ", "").split(",") if x.lstrip("-").isdigit()}

    @property
    def proxy(self) -> str:
        """Прокси для Telegram: из .env, иначе — системный прокси Windows (если включён).

        Читается при каждом запросе, а не кэшируется: VPN-клиент может перезапуститься
        и сменить порт, бот должен подхватить новый без перезапуска.
        """
        if self.telegram_proxy:
            return self.telegram_proxy
        if os.name != "nt":
            return ""
        try:
            import winreg

            with winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\CurrentVersion\Internet Settings",
            ) as key:
                enabled = winreg.QueryValueEx(key, "ProxyEnable")[0]
                server = str(winreg.QueryValueEx(key, "ProxyServer")[0])
        except OSError:
            return ""
        if not enabled or not server:
            return ""
        # формат может быть "host:port" или "http=host:port;https=host:port"
        if "=" in server:
            parts = dict(p.split("=", 1) for p in server.split(";") if "=" in p)
            server = parts.get("https") or parts.get("http") or ""
        if not server:
            return ""
        return server if "://" in server else "http://" + server

    @cached_property
    def site(self) -> str:
        return self.site_url.rstrip("/")


settings = Settings()
