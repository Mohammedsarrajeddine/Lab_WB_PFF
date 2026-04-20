"""Embedding helper using sentence-transformers."""

from __future__ import annotations

from functools import lru_cache

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

from app.core.config import settings


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    """Load and cache the embedding model (downloaded on first call)."""
    return SentenceTransformer(settings.embedding_model)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts and return a list of float vectors."""
    model = _get_model()
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return [row.tolist() for row in embeddings]


def embed_query(text: str) -> list[float]:
    """Embed a single query string."""
    return embed_texts([text])[0]


def get_embedding_dimension() -> int:
    """Return the dimensionality of the current embedding model."""
    model = _get_model()
    return model.get_sentence_embedding_dimension()
