from collections import defaultdict
from datetime import date as Date
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user, require_subscriber
from app.models import DayClose, Marathon, MarathonMember, Task, User, utcnow
from app.services.subscription import has_access

router = APIRouter(prefix="/friends", tags=["friends"])


def rank_for(tasks_done: int) -> str:
    if tasks_done >= 1500:
        return "Легенда"
    if tasks_done >= 700:
        return "Мастер"
    if tasks_done >= 250:
        return "Атлет"
    return "Новичок"


async def _streak_map(db: AsyncSession, today: Date) -> dict[int, int]:
    rows = (
        await db.execute(
            select(DayClose.user_id, DayClose.day).where(DayClose.day >= today - timedelta(days=400))
        )
    ).all()
    by_user: dict[int, set[Date]] = defaultdict(set)
    for uid, day in rows:
        by_user[uid].add(day)
    out: dict[int, int] = {}
    for uid, days in by_user.items():
        d = today if today in days else today - timedelta(days=1)
        n = 0
        while d in days:
            n += 1
            d -= timedelta(days=1)
        out[uid] = n
    return out


@router.get("")
async def list_friends(user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    today = utcnow().date()
    users = (
        await db.scalars(
            select(User).where(User.id != user.id, User.is_blocked == False).order_by(User.last_seen_at.desc().nullslast()).limit(50)  # noqa: E712
        )
    ).all()
    if not users:
        return []
    ids = [u.id for u in users]
    task_counts = dict(
        (
            await db.execute(
                select(Task.user_id, func.count()).where(Task.user_id.in_(ids), Task.done == True).group_by(Task.user_id)  # noqa: E712
            )
        ).all()
    )
    streaks = await _streak_map(db, today)
    marathons = dict(
        (
            await db.execute(
                select(MarathonMember.user_id, func.min(Marathon.title))
                .join(Marathon, Marathon.id == MarathonMember.marathon_id)
                .where(MarathonMember.user_id.in_(ids))
                .group_by(MarathonMember.user_id)
            )
        ).all()
    )
    now = utcnow()
    return [
        {
            "id": str(u.id),
            "username": u.username,
            "avatar_url": f"/api/friends/{u.id}/avatar?v={u.avatar_version}" if u.avatar_version else None,
            "tier": u.tier if has_access(u) else "free",
            "streak": streaks.get(u.id, 0),
            "completed_tasks": task_counts.get(u.id, 0),
            "rank": rank_for(task_counts.get(u.id, 0)),
            "online": bool(u.last_seen_at and (now - u.last_seen_at).total_seconds() < 900),
            "tagline": marathons.get(u.id) or "Участник сообщества",
            "role": u.role,
        }
        for u in users
    ]


@router.get("/{friend_id}")
async def friend_profile(
    friend_id: int, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)
):
    friend = await db.get(User, friend_id)
    if friend is None:
        raise HTTPException(404, "not_found")
    today = utcnow().date()
    since = today - timedelta(days=83)
    rows = (
        await db.scalars(
            select(Task).where(Task.user_id == friend.id, Task.day >= since, Task.day <= today)
        )
    ).all()
    by_day: dict[Date, list[Task]] = defaultdict(list)
    for t in rows:
        by_day[t.day].append(t)
    heatmap = []
    percents: list[int] = []
    for i in range(84):
        d = since + timedelta(days=i)
        day_tasks = by_day.get(d, [])
        if day_tasks:
            pct = round(sum(1 for t in day_tasks if t.done) * 100 / len(day_tasks))
            percents.append(pct)
            level = 4 if pct == 100 else 3 if pct >= 75 else 2 if pct >= 40 else 1
        else:
            pct = 0
            level = 0
        heatmap.append({"date": d.isoformat(), "percent": pct, "level": level})
    total_done = await db.scalar(
        select(func.count()).select_from(Task).where(Task.user_id == friend.id, Task.done == True)  # noqa: E712
    )
    streak = (await _streak_map(db, today)).get(friend.id, 0)
    marathons = (
        await db.scalars(
            select(Marathon)
            .join(MarathonMember, MarathonMember.marathon_id == Marathon.id)
            .where(MarathonMember.user_id == friend.id)
            .limit(6)
        )
    ).all()
    return {
        "id": str(friend.id),
        "username": friend.username,
        "avatar_url": f"/api/friends/{friend.id}/avatar?v={friend.avatar_version}" if friend.avatar_version else None,
        "tier": friend.tier if has_access(friend) else "free",
        "streak": streak,
        "completed_tasks": total_done or 0,
        "rank": rank_for(total_done or 0),
        "average_result": round(sum(percents) / len(percents)) if percents else 0,
        "active_days": len(percents),
        "heatmap": heatmap,
        "marathons": [
            {"id": m.id, "title": m.title, "starts_on": m.starts_on, "ends_on": m.ends_on} for m in marathons
        ],
    }


@router.get("/{friend_id}/avatar")
async def friend_avatar(
    friend_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    row = (await db.execute(select(User.avatar_data, User.avatar_mime).where(User.id == friend_id))).first()
    if not row or not row[0]:
        raise HTTPException(404, "no_avatar")
    return Response(
        row[0],
        media_type=row[1],
        headers={"Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff"},
    )
