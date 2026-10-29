from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import require_subscriber
from app.models import JournalEntry, User
from app.schemas import JournalIn

router = APIRouter(prefix="/journal", tags=["journal"])


def out(e: JournalEntry) -> dict:
    return {"id": e.id, "title": e.title, "content": e.content, "created_at": e.created_at, "updated_at": e.updated_at}


@router.get("")
async def list_entries(user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(select(JournalEntry).where(JournalEntry.user_id == user.id).order_by(JournalEntry.created_at.desc()).limit(200))
    return [out(e) for e in rows]


@router.post("", status_code=201)
async def create_entry(body: JournalIn, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    entry = JournalEntry(user_id=user.id, title=body.title.strip(), content=body.content)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return out(entry)


async def _own(db: AsyncSession, user: User, entry_id: int) -> JournalEntry:
    entry = await db.scalar(select(JournalEntry).where(JournalEntry.id == entry_id, JournalEntry.user_id == user.id))
    if entry is None:
        raise HTTPException(404, "not_found")
    return entry


@router.put("/{entry_id}")
async def update_entry(entry_id: int, body: JournalIn, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    entry = await _own(db, user, entry_id)
    entry.title = body.title.strip()
    entry.content = body.content
    await db.commit()
    await db.refresh(entry)
    return out(entry)


@router.delete("/{entry_id}", status_code=204)
async def delete_entry(entry_id: int, user: User = Depends(require_subscriber), db: AsyncSession = Depends(get_db)):
    await db.delete(await _own(db, user, entry_id))
    await db.commit()
