from app.models import User

TIER_RANK = {"none": 0, "standard": 1, "pro": 2, "premium": 3}
TIER_LABEL = {"standard": "Стандарт", "pro": "Pro", "premium": "Премиум"}
CABINET_MIN_RANK = TIER_RANK["pro"]


def has_access(user: User) -> bool:
    """Доступ в личный кабинет: активная подписка Pro/Премиум (владелец и куратор — всегда)."""
    if user.is_blocked:
        return False
    if user.is_admin or user.role in ("owner", "curator"):
        return True
    return user.subscription_status == "active" and TIER_RANK.get(user.tier, 0) >= CABINET_MIN_RANK


def apply_tier(user: User, tier: str) -> None:
    user.tier = tier
    user.subscription_status = "active" if tier != "none" else "inactive"
