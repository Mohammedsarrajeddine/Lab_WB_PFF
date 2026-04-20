"""Vector store operations using pgvector inside PostgreSQL."""

from __future__ import annotations

import logging

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.knowledge_chunk import KnowledgeChunk
from app.rag.ingestion.embedder import embed_query, embed_texts
from app.rag.ingestion.lab_knowledge import LAB_KNOWLEDGE

logger = logging.getLogger(__name__)


async def ensure_pgvector_extension(session: AsyncSession) -> None:
    """Create the pgvector extension if it does not exist yet."""
    await session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    await session.commit()


async def seed_knowledge(session: AsyncSession) -> int:
    """Embed and insert lab knowledge chunks (idempotent).

    Returns the number of newly inserted chunks.
    """
    existing_count = int(
        (
            await session.execute(
                select(func.count()).select_from(KnowledgeChunk)
            )
        ).scalar_one()
    )

    if existing_count >= len(LAB_KNOWLEDGE):
        logger.info(
            "Knowledge store already seeded (%d chunks). Skipping.",
            existing_count,
        )
        return 0

    # Clear and re-seed for idempotency
    if existing_count > 0:
        await session.execute(
            KnowledgeChunk.__table__.delete()  # type: ignore[attr-defined]
        )

    texts = [doc.content for doc in LAB_KNOWLEDGE]
    embeddings = embed_texts(texts)

    for doc, vector in zip(LAB_KNOWLEDGE, embeddings, strict=True):
        chunk = KnowledgeChunk(
            content=doc.content,
            category=doc.category,
            embedding=vector,
        )
        session.add(chunk)

    await session.flush()
    logger.info("Seeded %d knowledge chunks into pgvector.", len(LAB_KNOWLEDGE))
    return len(LAB_KNOWLEDGE)


async def query_similar(
    session: AsyncSession,
    query_text: str,
    *,
    top_k: int = 3,
    max_distance: float = 0.7,
) -> list[str]:
    """Return the most semantically similar knowledge chunks for a query.

    Uses cosine distance via pgvector ``<=>`` operator.
    Only returns chunks within ``max_distance`` (cosine distance < threshold)
    to prevent injecting irrelevant context into the LLM prompt.
    """
    query_vector = embed_query(query_text)
    distance_expr = KnowledgeChunk.embedding.cosine_distance(query_vector)

    stmt = (
        select(KnowledgeChunk.content)
        .where(distance_expr < max_distance)
        .order_by(distance_expr)
        .limit(top_k)
    )

    rows = (await session.execute(stmt)).scalars().all()
    return list(rows)
