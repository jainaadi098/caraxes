from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
import math

from google import genai
from google.genai import types

from app.core.config import get_settings

BATCH_SIZE = 50
MAX_EMBED_WORKERS = 6


@lru_cache
def _client() -> genai.Client:
    key = get_settings().gemini_api_key
    if not key:
        raise RuntimeError("GEMINI_API_KEY is empty in backend/.env")
    return genai.Client(api_key=key)


def _normalize(vec: list[float]) -> list[float]:
    # Scaling every vector to length 1 makes cosine similarity accurate
    # when we ask Gemini for a reduced size (768 instead of its full size).
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def to_pgvector(vec: list[float]) -> str:
    """The text format Postgres/pgvector accepts: '[0.1,0.2,...]'"""
    return "[" + ",".join(f"{x:.6f}" for x in vec) + "]"


def _embed_batch(batch_idx: int, batch: list[str], task_type: str) -> tuple[int, list[list[float]]]:
    settings = get_settings()
    response = _client().models.embed_content(
        model=settings.embedding_model,
        contents=batch,
        config=types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=settings.embedding_dimensions,
        ),
    )
    vectors = [_normalize(list(e.values)) for e in response.embeddings]
    if len(vectors) != len(batch):
        raise RuntimeError("Embedding API returned an unexpected number of vectors")
    return batch_idx, vectors


def _embed(texts: list[str], task_type: str) -> list[list[float]]:
    if not texts:
        return []
    if len(texts) <= BATCH_SIZE:
        _, vectors = _embed_batch(0, texts, task_type)
        return vectors

    batches = [
        (idx, texts[i : i + BATCH_SIZE])
        for idx, i in enumerate(range(0, len(texts), BATCH_SIZE))
    ]
    workers = min(len(batches), MAX_EMBED_WORKERS)
    with ThreadPoolExecutor(max_workers=workers) as executor:
        results = list(executor.map(lambda b: _embed_batch(b[0], b[1], task_type), batches))

    results.sort(key=lambda r: r[0])
    out: list[list[float]] = []
    for _, vectors in results:
        out.extend(vectors)
    return out


def embed_documents(texts: list[str]) -> list[list[float]]:
    return _embed(texts, "RETRIEVAL_DOCUMENT")


def embed_query(text: str) -> list[float]:
    return _embed([text], "RETRIEVAL_QUERY")[0]


def item_text(item: dict) -> str:
    """What we embed for a knowledge item: its category, title and content."""
    category = item["category"].replace("_", " ")
    title = item.get("title") or ""
    return f"{category} ({item['item_type']}): {title}\n{item['content']}"
def embed_queries(texts: list[str]) -> list[list[float]]:
    return _embed(texts, "RETRIEVAL_QUERY")