"""Repository for persistent runtime settings (key-value store in DB)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.runtime_setting import RuntimeSetting


async def get_all_settings(session: AsyncSession) -> dict[str, str]:
    """Return all persisted settings as a dict."""
    result = await session.execute(select(RuntimeSetting))
    rows = result.scalars().all()
    return {row.key: row.value for row in rows}


async def get_setting(session: AsyncSession, key: str) -> str | None:
    """Return value for a single key, or None."""
    row = await session.get(RuntimeSetting, key)
    return row.value if row else None


async def upsert_setting(session: AsyncSession, key: str, value: str) -> None:
    """Insert or update a single setting."""
    row = await session.get(RuntimeSetting, key)
    if row:
        row.value = value
    else:
        session.add(RuntimeSetting(key=key, value=value))


async def upsert_many(session: AsyncSession, settings: dict[str, str]) -> None:
    """Insert or update multiple settings at once."""
    for key, value in settings.items():
        await upsert_setting(session, key, value)


async def delete_setting(session: AsyncSession, key: str) -> None:
    """Delete a setting by key."""
    row = await session.get(RuntimeSetting, key)
    if row:
        await session.delete(row)
