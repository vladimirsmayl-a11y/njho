from collections import defaultdict
from datetime import date as Date
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import require_subscriber
from app.models import DayClose, Habit, HabitLog, Marathon, MarathonMember, Post, Task, User, today_utc
from app.schemas import HabitIn, HabitLogIn, TaskIn, TaskPatch

router = APIRouter(tags=["tracker"], dependencies=[Depends(require_subscriber)])

HISTORY_DAYS = 400
MAX_HABITS = 30
MAX_TASKS_PER_DAY = 100


def check_day(d: Date) -> None:
    """Клиент присылает свою локальную дату; допускаем разницу с UTC ±2 дня (часовые пояса), чтобы не накручивать серии."""
    if abs((d - today_utc()).days) > 2:
        raise HTTPException(400, "bad_date")


def streak_ending(days: set[Date], today: Date) -> int:
    d = today if today in days else today - timedelta(days=1)
    n = 0
    while d in days:
        n += 1
        d -= timedelta(days=1)
    return n


async def _load(db: AsyncSession, user_id: int, today: Date):
    habits = (
        await db.scalars(select(Habit).where(Habit.user_id == user_id, Habit.archived == False).order_by(Habit.id))  # noqa: E712
    ).all()
    logs: dict[int, set[Date]] = defaultdict(set)
    if habits:
        rows = await db.execute(
            select(HabitLog.habit_id, HabitLog.day).where(
                HabitLog.habit_id.in_([h.id for h in habits]), HabitLog.day >= today - timedelta(days=HISTORY_DAYS)
            )
        )
        for habit_id, day in rows.all():
            logs[habit_id].add(day)
    return habits, logs


async def _load_tasks(db: AsyncSession, user_id: int, today: Date) -> dict[Date, list[Task]]:
    rows = (
        await db.scalars(
            select(Task)
            .where(Task.user_id == user_id, Task.day >= today - timedelta(days=HISTORY_DAYS), Task.day <= today)
            .order_by(Task.id)
        )
    ).all()
    by_day: dict[Date, list[Task]] = defaultdict(list)
    for task in rows:
        by_day[task.day].append(task)
    return by_day


def _day_stats(habits: list[Habit], logs: dict[int, set[Date]], d: Date) -> tuple[int, int]:
    expected = [h for h in habits if h.created_on <= d]
    return sum(1 for h in expected if d in logs[h.id]), len(expected)


def _day_progress(tasks: dict[Date, list[Task]], habits: list[Habit], logs: dict[int, set[Date]], d: Date) -> tuple[int, int]:
    """Задачи — главный источник прогресса дня. Привычки — запасной, если задач нет."""
    day_tasks = tasks.get(d, [])
    if day_tasks:
        return sum(1 for t in day_tasks if t.done), len(day_tasks)
    return _day_stats(habits, logs, d)


def _closed_days(tasks: dict[Date, list[Task]], habits: list[Habit], logs: dict[int, set[Date]], today: Date) -> set[Date]:
    closed: set[Date] = set()
    for i in range(HISTORY_DAYS + 1):
        d = today - timedelta(days=i)
        done, total = _day_progress(tasks, habits, logs, d)
        if total and done == total:
            closed.add(d)
    return closed


@router.get("/habits")
async def list_habits(
    date: Date = Query(...),
    days: int = Query(default=28, ge=0, le=90),
    user: User = Depends(require_subscriber),
    db: AsyncSession = Depends(get_db),
):
    check_day(date)
    habits, logs = await _load(db, user.id, date)
    since = date - timedelta(days=days)
    return [
        {
            "id": h.id,
            "title": h.title,
            "icon": h.icon or "spark",
            "done": date in logs[h.id],
            "streak": streak_ending(logs[h.id], date),
            "history": [d.isoformat() for d in sorted(logs[h.id]) if since < d <= date],
        }
        for h in habits
    ]


@router.post("/habits", status_code=201)
async def create_habit(body: HabitIn, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    check_day(body.date)
    count = await db.scalar(select(func.count()).select_from(Habit).where(Habit.user_id == user.id, Habit.archived == False))  # noqa: E712
    if (count or 0) >= MAX_HABITS:
        raise HTTPException(400, "too_many_habits")
    habit = Habit(user_id=user.id, title=body.title, created_on=body.date, icon=body.icon or "spark")
    db.add(habit)
    await db.commit()
    return {"id": habit.id, "title": habit.title, "icon": habit.icon, "done": False, "streak": 0}


@router.delete("/habits/{habit_id}", status_code=204)
async def archive_habit(habit_id: int, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    habit = await db.scalar(select(Habit).where(Habit.id == habit_id, Habit.user_id == user.id))
    if habit is None:
        raise HTTPException(404, "not_found")
    habit.archived = True
    await db.commit()


@router.put("/habits/{habit_id}/log")
async def set_habit_log(habit_id: int, body: HabitLogIn, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    habit = await db.scalar(select(Habit).where(Habit.id == habit_id, Habit.user_id == user.id, Habit.archived == False))  # noqa: E712
    if habit is None:
        raise HTTPException(404, "not_found")
    check_day(body.date)
    if body.date < habit.created_on:
        raise HTTPException(400, "before_habit_start")
    existing = await db.scalar(select(HabitLog).where(HabitLog.habit_id == habit.id, HabitLog.day == body.date))
    if body.done and existing is None:
        db.add(HabitLog(habit_id=habit.id, day=body.date))
    elif not body.done and existing is not None:
        await db.delete(existing)
    try:
        await db.commit()
    except IntegrityError:  # двойной клик — запись уже есть
        await db.rollback()
    return {"ok": True}


@router.get("/dashboard")
async def dashboard(today: Date = Query(...), user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    check_day(today)
    habits, logs = await _load(db, user.id, today)
    tasks = await _load_tasks(db, user.id, today)
    closed = _closed_days(tasks, habits, logs, today)

    best, run = 0, 0
    for i in range(HISTORY_DAYS, -1, -1):
        run = run + 1 if (today - timedelta(days=i)) in closed else 0
        best = max(best, run)

    done_today, total_today = _day_progress(tasks, habits, logs, today)
    day_tasks = tasks.get(today, [])
    week = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        done, total = _day_progress(tasks, habits, logs, d)
        week.append({"date": d.isoformat(), "done": done, "total": total, "percent": round(done * 100 / total) if total else 0})

    # Фиксируем закрытие дня, чтобы история не зависела от правок задач задним числом.
    if total_today and done_today == total_today and today not in closed:
        closed.add(today)
    if total_today and done_today == total_today:
        existing = await db.scalar(select(DayClose).where(DayClose.user_id == user.id, DayClose.day == today))
        if existing is None:
            db.add(
                DayClose(
                    user_id=user.id,
                    day=today,
                    tasks_total=len(day_tasks),
                    tasks_done=sum(1 for t in day_tasks if t.done),
                    habits_total=len([h for h in habits if h.created_on <= today]),
                    habits_done=_day_stats(habits, logs, today)[0],
                )
            )
            try:
                await db.commit()
            except IntegrityError:
                await db.rollback()

    marathons = await db.scalar(
        select(func.count())
        .select_from(MarathonMember)
        .join(Marathon, Marathon.id == MarathonMember.marathon_id)
        .where(MarathonMember.user_id == user.id, Marathon.is_published == True, Marathon.starts_on <= today, Marathon.ends_on >= today)  # noqa: E712
    )
    posts = (await db.scalars(select(Post).order_by(Post.created_at.desc()).limit(5))).all()
    return {
        "streak": streak_ending(closed, today),
        "best_streak": best,
        "habits_total": total_today if not day_tasks else len([h for h in habits if h.created_on <= today]),
        "habits_done": _day_stats(habits, logs, today)[0],
        "percent": round(done_today * 100 / total_today) if total_today else 0,
        "day_closed": bool(total_today and done_today == total_today),
        "freeze_count": user.freeze_count or 0,
        "week": week,
        "tasks_total": len(day_tasks),
        "tasks_done": sum(1 for t in day_tasks if t.done),
        "active_marathons": marathons or 0,
        "posts": [{"id": p.id, "title": p.title, "body": p.body, "created_at": p.created_at} for p in posts],
    }


@router.post("/streak/freeze")
async def apply_freeze(user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    """Заморозка закрывает вчерашний день, если он не был закрыт: серия сохраняется."""
    if (user.freeze_count or 0) <= 0:
        raise HTTPException(400, "no_freezes")
    yesterday = today_utc() - timedelta(days=1)
    existing = await db.scalar(select(DayClose).where(DayClose.user_id == user.id, DayClose.day == yesterday))
    if existing is not None:
        raise HTTPException(400, "day_already_closed")
    user.freeze_count = max(0, (user.freeze_count or 0) - 1)
    db.add(DayClose(user_id=user.id, day=yesterday, tasks_total=0, tasks_done=0, habits_total=0, habits_done=0))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
    return {"ok": True, "freeze_count": user.freeze_count}


@router.get("/tasks")
async def list_tasks(date: Date = Query(...), user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    check_day(date)
    rows = (await db.scalars(select(Task).where(Task.user_id == user.id, Task.day == date).order_by(Task.id))).all()
    return [
        {"id": t.id, "title": t.title, "done": t.done, "tag": t.tag, "due_time": t.due_time}
        for t in rows
    ]


@router.post("/tasks", status_code=201)
async def create_task(body: TaskIn, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    check_day(body.date)
    count = await db.scalar(select(func.count()).select_from(Task).where(Task.user_id == user.id, Task.day == body.date))
    if (count or 0) >= MAX_TASKS_PER_DAY:
        raise HTTPException(400, "too_many_tasks")
    task = Task(user_id=user.id, day=body.date, title=body.title, tag=body.tag, due_time=body.due_time)
    db.add(task)
    await db.commit()
    return {"id": task.id, "title": task.title, "done": False, "tag": task.tag, "due_time": task.due_time}


@router.patch("/tasks/{task_id}")
async def patch_task(task_id: int, body: TaskPatch, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    task = await db.scalar(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    if task is None:
        raise HTTPException(404, "not_found")
    if body.title is not None:
        task.title = body.title
    if body.done is not None:
        task.done = body.done
    if "tag" in body.model_fields_set:
        task.tag = body.tag
    if "due_time" in body.model_fields_set:
        task.due_time = body.due_time
    await db.commit()

    # Закрытие дня по задачам: как только все задачи выполнены — день закрыт,
    # серия и огонёк растут без ручных действий.
    day_tasks = (await db.scalars(select(Task).where(Task.user_id == user.id, Task.day == task.day))).all()
    day_closed = bool(day_tasks) and all(t.done for t in day_tasks)
    if day_closed:
        existing = await db.scalar(select(DayClose).where(DayClose.user_id == user.id, DayClose.day == task.day))
        if existing is None:
            db.add(
                DayClose(
                    user_id=user.id,
                    day=task.day,
                    tasks_total=len(day_tasks),
                    tasks_done=len(day_tasks),
                )
            )
            try:
                await db.commit()
            except IntegrityError:
                await db.rollback()

    habits, logs = await _load(db, user.id, task.day)
    all_tasks = await _load_tasks(db, user.id, task.day)
    closed = _closed_days(all_tasks, habits, logs, task.day)
    best, run = 0, 0
    for i in range(HISTORY_DAYS, -1, -1):
        run = run + 1 if (task.day - timedelta(days=i)) in closed else 0
        best = max(best, run)
    done_count = sum(1 for t in day_tasks if t.done)
    return {
        "id": task.id,
        "title": task.title,
        "done": task.done,
        "tag": task.tag,
        "due_time": task.due_time,
        "day_closed": day_closed,
        "streak": streak_ending(closed, task.day),
        "best_streak": best,
        "tasks_done": done_count,
        "tasks_total": len(day_tasks),
        "percent": round(done_count * 100 / len(day_tasks)) if day_tasks else 0,
    }


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: int, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Task).where(Task.id == task_id, Task.user_id == user.id))
    await db.commit()
