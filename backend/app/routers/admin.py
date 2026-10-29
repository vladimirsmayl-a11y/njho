from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import require_admin
from app.models import (
    ActionLog,
    ChatMessage,
    Marathon,
    MarathonMember,
    MarathonReport,
    MarathonTask,
    Notification,
    Post,
    User,
    utcnow,
)
from app.schemas import AdminUserPatch, MarathonIn, MarathonPatch, MarathonTaskIn, NotifyIn, PostIn, ReviewIn
from app.services.broadcast import broadcast_post
from app.services.subscription import apply_tier, has_access

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def user_out(u: User) -> dict:
    return {
        "id": u.id,
        "telegram_id": u.telegram_id,
        "telegram_username": u.telegram_username,
        "username": u.username,
        "email": u.email,
        "tier": u.tier,
        "subscription_status": u.subscription_status,
        "tier_locked": u.tier_locked,
        "role": u.role or ("owner" if u.is_admin else "member"),
        "is_admin": u.is_admin,
        "is_blocked": u.is_blocked,
        "blocked_reason": u.blocked_reason,
        "has_access": has_access(u),
        "last_seen_at": u.last_seen_at,
        "created_at": u.created_at,
    }


def marathon_out(m: Marathon, tasks: list[MarathonTask] | None = None) -> dict:
    data = {
        "id": m.id,
        "title": m.title,
        "description": m.description,
        "starts_on": m.starts_on,
        "ends_on": m.ends_on,
        "premium_only": m.premium_only,
        "is_published": m.is_published,
    }
    if tasks is not None:
        data["tasks"] = [
            {"id": t.id, "title": t.title, "description": t.description, "due_on": t.due_on, "position": t.position}
            for t in tasks
        ]
    return data


async def add_log(db: AsyncSession, actor: User | None, action: str, message: str, level: str = "info") -> None:
    db.add(
        ActionLog(
            actor_id=actor.id if actor else None,
            actor_name=actor.username if actor else "system",
            level=level,
            action=action,
            message=message[:400],
        )
    )


@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_db)):
    now = utcnow()
    total = await db.scalar(select(func.count()).select_from(User))
    rows = await db.execute(select(User.tier, func.count()).where(User.subscription_status == "active").group_by(User.tier))
    blocked = await db.scalar(select(func.count()).select_from(User).where(User.is_blocked == True))  # noqa: E712
    dau = await db.scalar(select(func.count()).select_from(User).where(User.last_seen_at >= now - timedelta(days=1)))
    wau = await db.scalar(select(func.count()).select_from(User).where(User.last_seen_at >= now - timedelta(days=7)))
    new_today = await db.scalar(
        select(func.count()).select_from(User).where(User.created_at >= now - timedelta(days=1))
    )
    pending = await db.scalar(select(func.count()).select_from(MarathonReport).where(MarathonReport.status == "pending"))
    active_marathons = await db.scalar(
        select(func.count()).select_from(Marathon).where(Marathon.is_published == True)  # noqa: E712
    )
    return {
        "users": total or 0,
        "active_by_tier": {tier: n for tier, n in rows.all()},
        "blocked": blocked or 0,
        "dau": dau or 0,
        "wau": wau or 0,
        "new_today": new_today or 0,
        "reports_pending": pending or 0,
        "marathons": active_marathons or 0,
    }


@router.get("/activity")
async def activity(db: AsyncSession = Depends(get_db)):
    """Реальные DAU/WAU за последние 7 дней по last_seen_at."""
    now = utcnow()
    out = []
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        dau = await db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.last_seen_at >= day_start, User.last_seen_at < day_end)
        )
        wau = await db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.last_seen_at >= day_end - timedelta(days=7), User.last_seen_at < day_end)
        )
        out.append({"date": day_start.date().isoformat(), "dau": dau or 0, "wau": wau or 0})
    return out


@router.get("/users")
async def list_users(
    q: str = Query(default="", max_length=64),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).order_by(User.id.desc()).offset(offset).limit(limit)
    q = q.strip().lstrip("@")
    if q:
        like = f"%{q.lower()}%"
        cond = [
            func.lower(User.username).like(like),
            func.lower(func.coalesce(User.email, "")).like(like),
            func.lower(func.coalesce(User.telegram_username, "")).like(like),
        ]
        if q.isdigit():
            cond.append(User.telegram_id == int(q))
        stmt = stmt.where(or_(*cond))
    return [user_out(u) for u in (await db.scalars(stmt)).all()]


@router.patch("/users/{user_id}")
async def patch_user(
    user_id: int,
    body: AdminUserPatch,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "not_found")
    if body.is_blocked is not None:
        if user.id == admin.id:
            raise HTTPException(400, "cannot_block_self")
        user.is_blocked = body.is_blocked
        user.blocked_reason = body.blocked_reason if body.is_blocked else None
        await add_log(
            db,
            admin,
            "ban" if body.is_blocked else "unban",
            f"{'Заблокирован' if body.is_blocked else 'Разблокирован'} @{user.username}",
            "warn" if body.is_blocked else "info",
        )
        db.add(
            Notification(
                user_id=user.id,
                title="Доступ приостановлен" if body.is_blocked else "Доступ восстановлен",
                body=(body.blocked_reason or "Обратитесь в поддержку") if body.is_blocked else "Можно продолжать.",
                kind="block",
            )
        )
    if body.role is not None and body.role != user.role:
        if body.role == "owner" and not admin.is_admin and admin.role != "owner":
            raise HTTPException(403, "forbidden")
        user.role = body.role
        user.is_admin = body.role == "owner"
        await add_log(db, admin, "role", f"@{user.username}: роль {body.role}")
    if body.tier is not None:
        apply_tier(user, body.tier)
        # ручное изменение тарифа блокирует автоматику бота, пока админ не вернёт tier_locked=false
        user.tier_locked = True if body.tier_locked is None else body.tier_locked
        await add_log(db, admin, "tier", f"@{user.username}: тариф {body.tier}")
    elif body.tier_locked is not None:
        user.tier_locked = body.tier_locked
    await db.commit()
    return user_out(user)


@router.post("/users/{user_id}/notify")
async def notify_user(
    user_id: int,
    body: NotifyIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "not_found")
    db.add(Notification(user_id=user.id, title=body.title, body=body.text, kind="admin"))
    await add_log(db, admin, "notify", f"Уведомление @{user.username}: {body.text[:80]}")
    await db.commit()
    return {"ok": True}


@router.get("/logs")
async def list_logs(
    level: str = Query(default="all", max_length=16),
    q: str = Query(default="", max_length=64),
    limit: int = Query(default=100, ge=1, le=300),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ActionLog).order_by(ActionLog.created_at.desc()).limit(limit)
    if level in ("info", "warn", "error"):
        stmt = stmt.where(ActionLog.level == level)
    if q.strip():
        stmt = stmt.where(ActionLog.message.ilike(f"%{q.strip()}%"))
    rows = (await db.scalars(stmt)).all()
    return [
        {
            "id": r.id,
            "time": r.created_at,
            "level": r.level,
            "actor": r.actor_name,
            "action": r.action,
            "message": r.message,
        }
        for r in rows
    ]


@router.get("/posts")
async def list_posts(db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(select(Post).order_by(Post.created_at.desc()).limit(50))
    return [
        {
            "id": p.id,
            "title": p.title,
            "body": p.body,
            "created_at": p.created_at,
            "sent_to_telegram": p.sent_to_telegram,
            "sent_count": p.sent_count,
        }
        for p in rows
    ]


@router.post("/posts", status_code=201)
async def create_post(
    body: PostIn,
    background: BackgroundTasks,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    post = Post(
        title=body.title,
        body=body.body,
        author_id=admin.id,
        sent_to_telegram=body.send_to_telegram,
    )
    db.add(post)
    await db.flush()
    # Уведомление в колокольчик всем пользователям.
    user_ids = (await db.scalars(select(User.id).where(User.is_blocked == False))).all()  # noqa: E712
    for uid in user_ids:
        db.add(Notification(user_id=uid, title=body.title, body=body.body[:500], kind="broadcast"))
    post.sent_count = len(user_ids)
    await add_log(db, admin, "broadcast", f"Рассылка «{body.title}»: {len(user_ids)} получателей")
    await db.commit()
    if body.send_to_telegram:
        background.add_task(broadcast_post, post.id)
    return {"id": post.id, "sent_count": len(user_ids)}


@router.delete("/posts/{post_id}", status_code=204)
async def delete_post(post_id: int, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    post = await db.get(Post, post_id)
    if post is not None:
        await db.delete(post)
        await add_log(db, admin, "broadcast_delete", f"Удалена рассылка #{post_id}")
        await db.commit()


@router.get("/marathons")
async def list_marathons(db: AsyncSession = Depends(get_db)):
    marathons = (await db.scalars(select(Marathon).order_by(Marathon.starts_on.desc()))).all()
    tasks = (await db.scalars(select(MarathonTask).order_by(MarathonTask.position, MarathonTask.id))).all()
    members = dict((await db.execute(select(MarathonMember.marathon_id, func.count()).group_by(MarathonMember.marathon_id))).all())
    by_marathon: dict[int, list[MarathonTask]] = {}
    for t in tasks:
        by_marathon.setdefault(t.marathon_id, []).append(t)
    out = []
    for m in marathons:
        item = marathon_out(m, by_marathon.get(m.id, []))
        item["members"] = members.get(m.id, 0)
        out.append(item)
    return out


@router.post("/marathons", status_code=201)
async def create_marathon(body: MarathonIn, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    if body.ends_on < body.starts_on:
        raise HTTPException(400, "bad_dates")
    m = Marathon(**body.model_dump())
    db.add(m)
    await add_log(db, admin, "marathon", f"Создан марафон «{body.title}»")
    await db.commit()
    return marathon_out(m, [])


@router.patch("/marathons/{marathon_id}")
async def patch_marathon(
    marathon_id: int, body: MarathonPatch, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    m = await db.get(Marathon, marathon_id)
    if m is None:
        raise HTTPException(404, "not_found")
    for key, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(m, key, value)
    if m.ends_on < m.starts_on:
        raise HTTPException(400, "bad_dates")
    await add_log(db, admin, "marathon", f"Обновлён марафон «{m.title}»")
    await db.commit()
    return marathon_out(m)


@router.post("/marathons/{marathon_id}/tasks", status_code=201)
async def add_task(
    marathon_id: int, body: MarathonTaskIn, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)
):
    if await db.get(Marathon, marathon_id) is None:
        raise HTTPException(404, "not_found")
    last = await db.scalar(select(func.max(MarathonTask.position)).where(MarathonTask.marathon_id == marathon_id))
    task = MarathonTask(marathon_id=marathon_id, position=(last or 0) + 1, **body.model_dump())
    db.add(task)
    await add_log(db, admin, "marathon_task", f"Задание «{body.title}» добавлено")
    await db.commit()
    return {"id": task.id}


@router.delete("/marathon-tasks/{task_id}", status_code=204)
async def delete_task(task_id: int, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    task = await db.get(MarathonTask, task_id)
    if task is not None:
        await db.delete(task)
        await add_log(db, admin, "marathon_task", f"Задание #{task_id} удалено")
        await db.commit()


@router.get("/marathons/{marathon_id}/reports")
async def list_reports(marathon_id: int, db: AsyncSession = Depends(get_db)):
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
            "task_id": r.task_id,
            "text": r.text,
            "status": r.status,
            "comment": r.review_comment,
            "has_image": r.image_mime is not None,
            "image_url": f"/api/marathons/{marathon_id}/tasks/{r.task_id}/report/image"
            if r.image_mime
            else None,
            "created_at": r.created_at,
        }
        for r, name, title in rows.all()
    ]


@router.post("/reports/{report_id}/review")
async def review_report(
    report_id: int,
    body: ReviewIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    report = await db.get(MarathonReport, report_id)
    if report is None:
        raise HTTPException(404, "not_found")
    report.status = body.status
    report.review_comment = body.comment
    report.reviewed_by = admin.id
    report.reviewed_at = utcnow()
    task = await db.get(MarathonTask, report.task_id)
    await add_log(
        db,
        admin,
        "report_review",
        f"Отчёт #{report_id} ({task.title if task else '—'}): {body.status}",
    )
    db.add(
        Notification(
            user_id=report.user_id,
            title="Задание проверено",
            body=("Задание принято" if body.status == "approved" else "Нужно доработать")
            + (f": {body.comment}" if body.comment else ""),
            kind="report",
        )
    )
    await db.commit()
    return {"ok": True, "status": report.status}


@router.post("/marathons/{marathon_id}/chat/clear")
async def clear_chat(marathon_id: int, admin: User = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(delete(ChatMessage).where(ChatMessage.marathon_id == marathon_id))
    await add_log(db, admin, "chat_clear", f"Очищен чат марафона #{marathon_id}: {res.rowcount or 0} сообщений", "warn")
    await db.commit()
    return {"ok": True, "deleted": res.rowcount or 0}
