import base64
import hashlib
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings


def _prehash(password: str) -> bytes:
    # sha256 → base64: снимает лимит bcrypt в 72 байта и проблему с нулевыми байтами
    return base64.b64encode(hashlib.sha256(password.encode("utf-8")).digest())


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prehash(password), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prehash(password), hashed.encode("ascii"))
    except ValueError:
        return False


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


# без похожих символов (0/O, 1/I/L), чтобы код было легко продиктовать и ввести
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def normalize_code(value: str) -> str:
    """Код вводится руками: игнорируем регистр, дефисы и пробелы."""
    return "".join(ch for ch in value.upper() if ch.isalnum())


def generate_login_code() -> str:
    raw = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(8))
    return f"{raw[:4]}-{raw[4:]}"


def generate_password() -> str:
    raw = "".join(secrets.choice(_CODE_ALPHABET.lower()) for _ in range(10))
    return f"{raw[:5]}-{raw[5:]}"


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": now, "exp": now + timedelta(days=settings.jwt_ttl_days)}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> int:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], options={"require": ["exp", "sub"]})
    return int(payload["sub"])


class RateLimiter:
    """Простейший in-memory лимитер (на один процесс). Для нескольких инстансов — Redis."""

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def hit(self, key: str) -> bool:
        now = time.monotonic()
        q = self._hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.limit:
            return False
        q.append(now)
        return True
