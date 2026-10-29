from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_models
from app.routers import admin, auth, friends, journal, marathons, me, tracker


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.jwt_secret == "change-me" and settings.cookie_secure:
        raise RuntimeError("Задайте JWT_SECRET (длинная случайная строка) перед запуском в продакшене")
    await init_models()
    yield


app = FastAPI(
    title="LVS API",
    lifespan=lifespan,
    docs_url=None if settings.cookie_secure else "/docs",
    redoc_url=None,
    openapi_url=None if settings.cookie_secure else "/openapi.json",
)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

for r in (auth.router, me.router, tracker.router, journal.router, marathons.router, friends.router, admin.router):
    app.include_router(r)


@app.get("/health")
async def health():
    return {"ok": True}
