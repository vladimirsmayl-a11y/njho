from datetime import date as Date
from typing import Annotated, Literal

from pydantic import BaseModel, EmailStr, Field, StringConstraints

Username = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=32, pattern=r"^\w+$")]
Title120 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Title160 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
Title200 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Tier = Literal["none", "standard", "pro", "premium"]
Role = Literal["owner", "curator", "member"]
Language = Literal["ru", "kz", "en"]


class ExchangeIn(BaseModel):
    token: str | None = Field(default=None, max_length=64)
    code: str | None = Field(default=None, max_length=128)


class PasswordLoginIn(BaseModel):
    identifier: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class RegisterIn(BaseModel):
    username: Username
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    referral_code: str | None = Field(default=None, max_length=32)
    language: Language = "ru"


class ProfilePatch(BaseModel):
    username: Username | None = None
    email: EmailStr | None = None
    language: Language | None = None


class PasswordChangeIn(BaseModel):
    current_password: str | None = Field(default=None, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class HabitIn(BaseModel):
    title: Title120
    date: Date
    icon: str | None = Field(default=None, max_length=24)


class HabitLogIn(BaseModel):
    date: Date
    done: bool


class TaskIn(BaseModel):
    title: Title200
    date: Date
    tag: str | None = Field(default=None, max_length=40)
    due_time: str | None = Field(default=None, max_length=8)


class TaskPatch(BaseModel):
    title: Title200 | None = None
    done: bool | None = None
    tag: str | None = Field(default=None, max_length=40)
    due_time: str | None = Field(default=None, max_length=8)


class JournalIn(BaseModel):
    title: str = Field(default="", max_length=120)
    content: str = Field(min_length=1, max_length=20000)


class ReportIn(BaseModel):
    text: str = Field(default="", max_length=5000)


class ReviewIn(BaseModel):
    status: Literal["approved", "rejected"]
    comment: str | None = Field(default=None, max_length=400)


class ChatIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class PostIn(BaseModel):
    title: Title160
    body: str = Field(min_length=1, max_length=3500)
    send_to_telegram: bool = False


class MarathonIn(BaseModel):
    title: Title160
    description: str = Field(default="", max_length=5000)
    starts_on: Date
    ends_on: Date
    premium_only: bool = False
    is_published: bool = False


class MarathonPatch(BaseModel):
    title: Title160 | None = None
    description: str | None = Field(default=None, max_length=5000)
    starts_on: Date | None = None
    ends_on: Date | None = None
    premium_only: bool | None = None
    is_published: bool | None = None


class MarathonTaskIn(BaseModel):
    title: Title160
    description: str = Field(default="", max_length=5000)
    due_on: Date | None = None


class AdminUserPatch(BaseModel):
    tier: Tier | None = None
    tier_locked: bool | None = None
    is_blocked: bool | None = None
    blocked_reason: str | None = Field(default=None, max_length=200)
    role: Role | None = None


class NotifyIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    title: str = Field(default="Сообщение от команды", max_length=160)
