import asyncio
import json
from datetime import timedelta

import jwt
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, WebSocket, WebSocketDisconnect
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import SessionLocal, get_db
from app.deps import SESSION_COOKIE, require_curator, require_subscriber
from app.models import ChatMessage, Marathon, MarathonMember, MarathonReport, MarathonTask, User, today_utc, utcnow
from app.schemas import ChatIn, ReportIn, ReviewIn
from app.security import decode_access_token
from app.services.subscription import TIER_RANK

router = APIRouter(prefix="/marathons", tags=["marathons"])

MAX_CHAT_IMAGE = 3_000_000


def _status(m: Marathon) -> str:
    today = today_utc()
    return "upcoming" if today < m.starts_on else "finished" if today > m.ends_on else "active"


async def _published(db: AsyncSession, marathon_id: int) -> Marathon:
    m = await db.scalar(select(Marathon).where(Marathon.id == marathon_id, Marathon.is_published == True))  # noqa: E712
    if m is None:
        raise HTTPException(404, "not_found")
    return m


async def _member(db: AsyncSession, marathon_id: int, user_id: int) -> bool:
    return bool(
        await db.scalar(
            select(MarathonMember).where(
                MarathonMember.marathon_id == marathon_id, MarathonMember.user_id == user_id
            )
        )
    )


def message_out(m: ChatMessage, username: str, avatar_version: int, me_id: int) -> dict:
    return {
        "id": m.id,
        "sender_id": m.user_id,
        "sender_name": username,
        "text": m.text,
        "has_image": m.image_mime is not None,
        "image_url": f"/api/marathons/{m.marathon_id}/chat/{m.id}/image" if m.image_mime else None,
        "avatar_url": f"/api/friends/{m.user_id}/avatar?v={avatar_version}" if avatar_version else None,
        "is_me": m.user_id == me_id,
        "created_at": m.created_at,
    }


@router.get("")
async def list_marathons(user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    marathons = (await db.scalars(select(Marathon).where(Marathon.is_published == True).order_by(Marathon.starts_on.desc()))).all()  # noqa: E712
    joined = set((await db.scalars(select(MarathonMember.marathon_id).where(MarathonMember.user_id == user.id))).all())
    task_counts = dict((await db.execute(select(MarathonTask.marathon_id, func.count()).group_by(MarathonTask.marathon_id))).all())
    report_counts = dict(
        (
            await db.execute(
                select(MarathonTask.marathon_id, func.count())
                .select_from(MarathonReport)
                .join(MarathonTask, MarathonTask.id == MarathonReport.task_id)
                .where(MarathonReport.user_id == user.id)
                .group_by(MarathonTask.marathon_id)
            )
        ).all()
    )
    return [
        {
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "starts_on": m.starts_on,
            "ends_on": m.ends_on,
            "premium_only": m.premium_only,
            "status": _status(m),
            "joined": m.id in joined,
            "tasks_total": task_counts.get(m.id, 0),
            "reports_done": report_counts.get(m.id, 0),
        }
        for m in marathons
    ]


@router.get("/{marathon_id}")
async def get_marathon(marathon_id: int, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    m = await _published(db, marathon_id)
    joined = await db.scalar(
        select(MarathonMember).where(MarathonMember.marathon_id == m.id, MarathonMember.user_id == user.id)
    )
    tasks = (
        await db.scalars(
            select(MarathonTask).where(MarathonTask.marathon_id == m.id).order_by(MarathonTask.position, MarathonTask.id)
        )
    ).all()
    reports: dict[int, MarathonReport] = {}
    if tasks:
        rows = await db.scalars(
            select(MarathonReport).where(
                MarathonReport.user_id == user.id, MarathonReport.task_id.in_([t.id for t in tasks])
            )
        )
        reports = {r.task_id: r for r in rows}
    members = await db.scalar(
        select(func.count()).select_from(MarathonMember).where(MarathonMember.marathon_id == m.id)
    )
    return {
        "id": m.id,
        "title": m.title,
        "description": m.description,
        "starts_on": m.starts_on,
        "ends_on": m.ends_on,
        "premium_only": m.premium_only,
        "status": _status(m),
        "joined": joined is not None,
        "members": members or 0,
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "due_on": t.due_on,
                "report": reports[t.id].text if t.id in reports else None,
                "status": reports[t.id].status if t.id in reports else "open",
                "comment": reports[t.id].review_comment if t.id in reports else None,
                "has_image": bool(reports[t.id].image_mime) if t.id in reports else False,
            }
            for t in tasks
        ],
    }


@router.post("/{marathon_id}/join")
async def join(marathon_id: int, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    m = await _published(db, marathon_id)
    if m.premium_only and TIER_RANK.get(user.tier, 0) < TIER_RANK["premium"] and not user.is_admin:
        raise HTTPException(403, "premium_required")
    if _status(m) == "finished":
        raise HTTPException(400, "finished")
    db.add(MarathonMember(marathon_id=m.id, user_id=user.id))
    try:
        await db.commit()
    except IntegrityError:  # уже участвует
        await db.rollback()
    return {"ok": True}


def _sniff_image(data: bytes) -> str | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


@router.post("/{marathon_id}/tasks/{task_id}/report")
async def submit_report(
    marathon_id: int,
    task_id: int,
    body: ReportIn,
    user: User = Depends(require_subscriber),
    db: AsyncSession = Depends(get_db),
):
    m = await _published(db, marathon_id)
    if not await _member(db, m.id, user.id):
        raise HTTPException(403, "not_joined")
    if today_utc() > m.ends_on + timedelta(days=1):
        raise HTTPException(400, "finished")
    task = await db.scalar(select(MarathonTask).where(MarathonTask.id == task_id, MarathonTask.marathon_id == m.id))
    if task is None:
        raise HTTPException(404, "not_found")
    report = await db.scalar(
        select(MarathonReport).where(MarathonReport.task_id == task.id, MarathonReport.user_id == user.id)
    )
    if report is None:
        db.add(MarathonReport(task_id=task.id, user_id=user.id, text=body.text.strip(), status="pending"))
    else:
        report.text = body.text.strip()
        report.status = "pending"
        report.review_comment = None
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "try_again")
    return {"ok": True}


@router.post("/{marathon_id}/tasks/{task_id}/report/photo")
async def submit_report_photo(
    marathon_id: int,
    task_id: int,
    file: UploadFile = File(...),
    user: User = Depends(require_subscriber),
    db: AsyncSession = Depends(get_db),
):
    m = await _published(db, marathon_id)
    if not await _member(db, m.id, user.id):
        raise HTTPException(403, "not_joined")
    data = await file.read(MAX_CHAT_IMAGE + 1)
    if len(data) > MAX_CHAT_IMAGE:
        raise HTTPException(413, "file_too_large")
    mime = _sniff_image(data)
    if mime is None:
        raise HTTPException(415, "unsupported_image")
    task = await db.scalar(select(MarathonTask).where(MarathonTask.id == task_id, MarathonTask.marathon_id == m.id))
    if task is None:
        raise HTTPException(404, "not_found")
    report = await db.scalar(
        select(MarathonReport).where(MarathonReport.task_id == task.id, MarathonReport.user_id == user.id)
    )
    if report is None:
        report = MarathonReport(task_id=task.id, user_id=user.id, text="", status="pending")
        db.add(report)
    report.image_data = data
    report.image_mime = mime
    report.status = "pending"
    report.review_comment = None
    await db.commit()
    return {"ok": True, "has_image": True}


@router.get("/{marathon_id}/tasks/{task_id}/report/image")
async def report_image(
    marathon_id: int, task_id: int, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)
):
    row = (
        await db.execute(
            select(MarathonReport.image_data, MarathonReport.image_mime)
            .join(MarathonTask, MarathonTask.id == MarathonReport.task_id)
            .where(MarathonReport.task_id == task_id, MarathonTask.marathon_id == marathon_id)
            .order_by(MarathonReport.created_at.desc())
        )
    ).first()
    if not row or not row[0]:
        raise HTTPException(404, "no_image")
    return Response(row[0], media_type=row[1], headers={"Cache-Control": "private, max-age=3600"})


@router.get("/{marathon_id}/reports")
async def list_reports(
    marathon_id: int, user: User = Depends(require_curator), db: AsyncSession = Depends(get_db)
):
    """Очередь проверки для куратора и владельца."""
    rows = await db.execute(
        select(MarathonReport, User.username, MarathonTask.title)
        .join(User, User.id == MarathonReport.user_id)
        .join(MarathonTask, MarathonTask.id == MarathonReport.task_id)
        .where(MarathonTask.marathon_id == marathon_id)
        .order_by(MarathonReport.created_at.desc())
        .limit(200)
    )
    return [
        {
            "id": r.id,
            "username": name,
            "task": title,
            "text": r.text,
            "status": r.status,
            "comment": r.review_comment,
            "has_image": r.image_mime is not None,
            "image_url": f"/api/marathons/{marathon_id}/tasks/{r.task_id}/report/image" if r.image_mime else None,
            "created_at": r.created_at,
        }
        for r, name, title in rows.all()
    ]


@router.post("/{marathon_id}/reports/{report_id}/review")
async def review_report(
    marathon_id: int,
    report_id: int,
    body: ReviewIn,
    curator: User = Depends(require_curator),
    db: AsyncSession = Depends(get_db),
):
    report = await db.get(MarathonReport, report_id)
    if report is None:
        raise HTTPException(404, "not_found")
    task = await db.get(MarathonTask, report.task_id)
    if task is None or task.marathon_id != marathon_id:
        raise HTTPException(404, "not_found")
    report.status = body.status
    report.review_comment = body.comment
    report.reviewed_by = curator.id
    report.reviewed_at = utcnow()
    await db.commit()
    return {"ok": True, "status": report.status}


# ---------------- Чат марафона ----------------

CONNECTIONS: dict[int, set[WebSocket]] = {}
LOCK = asyncio.Lock()


async def _broadcast(marathon_id: int, payload: dict) -> None:
    dead: list[WebSocket] = []
    async with LOCK:
        for ws in CONNECTIONS.get(marathon_id, set()):
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:  # noqa: BLE001
                dead.append(ws)
        for ws in dead:
            CONNECTIONS.get(marathon_id, set()).discard(ws)


async def _recent_messages(db: AsyncSession, marathon_id: int, me_id: int, limit: int = 60) -> list[dict]:
    rows = await db.execute(
        select(ChatMessage, User.username, User.avatar_version)
        .join(User, User.id == ChatMessage.user_id)
        .where(ChatMessage.marathon_id == marathon_id)
        .order_by(ChatMessage.id.desc())
        .limit(limit)
    )
    items = [message_out(m, name, avatar, me_id) for m, name, avatar in rows.all()]
    items.reverse()
    return items


@router.get("/{marathon_id}/chat")
async def chat_history(
    marathon_id: int,
    limit: int = Query(default=60, ge=1, le=200),
    user: User = Depends(require_subscriber),
    db: AsyncSession = Depends(get_db),
):
    await _published(db, marathon_id)
    return await _recent_messages(db, marathon_id, user.id, limit)


@router.post("/{marathon_id}/chat")
async def send_chat(
    marathon_id: int, body: ChatIn, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)
):
    await _published(db, marathon_id)
    if not await _member(db, marathon_id, user.id):
        raise HTTPException(403, "not_joined")
    msg = ChatMessage(marathon_id=marathon_id, user_id=user.id, text=body.text.strip())
    db.add(msg)
    await db.commit()
    payload = message_out(msg, user.username, user.avatar_version, user.id)
    await _broadcast(marathon_id, {"type": "message", "message": payload})
    return payload


@router.post("/{marathon_id}/chat/photo")
async def send_chat_photo(
    marathon_id: int,
    file: UploadFile = File(...),
    user: User = Depends(require_subscriber),
    db: AsyncSession = Depends(get_db),
):
    await _published(db, marathon_id)
    if not await _member(db, marathon_id, user.id):
        raise HTTPException(403, "not_joined")
    data = await file.read(MAX_CHAT_IMAGE + 1)
    if len(data) > MAX_CHAT_IMAGE:
        raise HTTPException(413, "file_too_large")
    mime = _sniff_image(data)
    if mime is None:
        raise HTTPException(415, "unsupported_image")
    msg = ChatMessage(marathon_id=marathon_id, user_id=user.id, text="", image_data=data, image_mime=mime)
    db.add(msg)
    await db.commit()
    payload = message_out(msg, user.username, user.avatar_version, user.id)
    await _broadcast(marathon_id, {"type": "message", "message": payload})
    return payload


@router.get("/{marathon_id}/chat/{message_id}/image")
async def chat_image(
    marathon_id: int, message_id: int, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)
):
    row = (
        await db.execute(
            select(ChatMessage.image_data, ChatMessage.image_mime).where(
                ChatMessage.id == message_id, ChatMessage.marathon_id == marathon_id
            )
        )
    ).first()
    if not row or not row[0]:
        raise HTTPException(404, "no_image")
    return Response(row[0], media_type=row[1], headers={"Cache-Control": "private, max-age=86400"})


@router.delete("/{marathon_id}/chat/{message_id}", status_code=204)
async def delete_own_message(
    marathon_id: int, message_id: int, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)
):
    await db.execute(
        delete(ChatMessage).where(
            ChatMessage.id == message_id, ChatMessage.marathon_id == marathon_id, ChatMessage.user_id == user.id
        )
    )
    await db.commit()
    await _broadcast(marathon_id, {"type": "delete", "id": message_id})


@router.websocket("/{marathon_id}/chat/ws")
async def chat_socket(websocket: WebSocket, marathon_id: int):
    token = websocket.cookies.get(SESSION_COOKIE)
    if not token:
        await websocket.close(code=4401)
        return
    try:
        user_id = decode_access_token(token)
    except (jwt.PyJWTError, ValueError):
        await websocket.close(code=4401)
        return

    async with SessionLocal() as db:
        user = await db.get(User, user_id)
        marathon = await db.scalar(
            select(Marathon).where(Marathon.id == marathon_id, Marathon.is_published == True)  # noqa: E712
        )
        if user is None or user.is_blocked or marathon is None or not await _member(db, marathon_id, user_id):
            await websocket.close(code=4403)
            return
        history = await _recent_messages(db, marathon_id, user.id)
        username = user.username
        avatar_version = user.avatar_version

    await websocket.accept()
    await websocket.send_text(json.dumps({"type": "history", "messages": history}, default=str))
    async with LOCK:
        CONNECTIONS.setdefault(marathon_id, set()).add(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            text = (data.get("text") or "").strip()[:4000]
            if not text:
                continue
            async with SessionLocal() as db:
                msg = ChatMessage(marathon_id=marathon_id, user_id=user_id, text=text)
                db.add(msg)
                await db.commit()
                payload = message_out(msg, username, avatar_version, user_id)
            await _broadcast(marathon_id, {"type": "message", "message": payload})
    except WebSocketDisconnect:
        pass
    finally:
        async with LOCK:
            CONNECTIONS.get(marathon_id, set()).discard(websocket)
