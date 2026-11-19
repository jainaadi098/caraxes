from concurrent.futures import ThreadPoolExecutor
import re
from uuid import UUID

from app.core.supabase_client import get_supabase
from app.services.embeddings import embed_queries, embed_query, to_pgvector

GLOBAL_COLUMNS = (
    "id, item_type, category, title, content, source_document_id, "
    "source_page, source_excerpt, is_global, metadata"
)

CHUNK_CHARS = 500       # sentences are grouped to ~500 chars for richer context and fewer searches
HARD_SPLIT = 800        # a single very long sentence is cut into pieces of this size
MAX_CHUNKS = 15         # upper limit on searches per piece of content
TOP_K_PER_CHUNK = 4
MAX_CONDITIONAL = 25    # most conditional items passed on to the analyser


def _fetch_global(org_id: UUID) -> list[dict]:
    return (
        get_supabase()
        .table("knowledge_items")
        .select(GLOBAL_COLUMNS)
        .eq("org_id", str(org_id))
        .eq("status", "approved")
        .eq("is_global", True)
        .order("category")
        .execute()
        .data
    )


def _match(
    org_id: UUID,
    vector: str,
    top_k: int,
    categories: list[str] | None = None,
    item_types: list[str] | None = None,
    tags: list[str] | None = None,
    min_similarity: float = 0.0,
) -> list[dict]:
    return (
        get_supabase()
        .rpc(
            "match_knowledge_items",
            {
                "query_embedding": vector,
                "match_org_id": str(org_id),
                "match_count": top_k,
                "filter_categories": categories,
                "filter_item_types": item_types,
                "filter_tags": tags,
                "min_similarity": min_similarity,
            },
        )
        .execute()
        .data
    )


def _match_batch(
    org_id: UUID,
    vectors: list[str],
    top_k: int,
    categories: list[str] | None = None,
    item_types: list[str] | None = None,
    tags: list[str] | None = None,
    min_similarity: float = 0.0,
) -> list[dict]:
    """
    Attempts to call match_knowledge_items_batch via Postgres RPC for a single round trip.
    If the batch RPC is not installed, falls back to running individual vector searches
    concurrently via ThreadPoolExecutor.
    """
    if not vectors:
        return []

    # Attempt 1: Batch Postgres RPC
    try:
        res = (
            get_supabase()
            .rpc(
                "match_knowledge_items_batch",
                {
                    "query_embeddings": vectors,
                    "match_org_id": str(org_id),
                    "match_count": top_k,
                    "filter_categories": categories,
                    "filter_item_types": item_types,
                    "filter_tags": tags,
                    "min_similarity": min_similarity,
                },
            )
            .execute()
        )
        if res.data is not None:
            return res.data
    except Exception:
        pass

    # Attempt 2: Dispatch queries concurrently across threads
    def _query_one(vec: str) -> list[dict]:
        try:
            return _match(org_id, vec, top_k, categories, item_types, tags, min_similarity) or []
        except Exception:
            return []

    workers = min(len(vectors), 8)
    with ThreadPoolExecutor(max_workers=workers) as executor:
        batch_results = list(executor.map(_query_one, vectors))

    all_rows: list[dict] = []
    for rows in batch_results:
        all_rows.extend(rows)
    return all_rows


def retrieve_knowledge(
    org_id: UUID,
    query: str,
    categories: list[str] | None = None,
    item_types: list[str] | None = None,
    tags: list[str] | None = None,
    top_k: int = 8,
    min_similarity: float = 0.0,
) -> dict:
    """Global rules plus the best matches for one query."""
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_global = executor.submit(_fetch_global, org_id)
        future_vec = executor.submit(lambda: to_pgvector(embed_query(query)))
        global_rules = future_global.result()
        vector = future_vec.result()

    return {
        "global_rules": global_rules,
        "matches": _match(org_id, vector, top_k, categories, item_types, tags, min_similarity),
    }


def split_into_chunks(text: str) -> list[str]:
    """Break content into sentence groups so each search has a focused meaning."""
    sentences: list[str] = []
    for line in re.split(r"\n+", text):
        for sentence in re.split(r"(?<=[.!?])\s+", line.strip()):
            sentence = sentence.strip()
            while len(sentence) > HARD_SPLIT:
                sentences.append(sentence[:HARD_SPLIT])
                sentence = sentence[HARD_SPLIT:]
            if sentence:
                sentences.append(sentence)

    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if current and len(current) + len(sentence) + 1 > CHUNK_CHARS:
            chunks.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}" if current else sentence
    if current:
        chunks.append(current)
    return chunks[:MAX_CHUNKS]


def retrieve_for_content(org_id: UUID, text: str, min_similarity: float = 0.0) -> dict:
    """
    Everything the analyser needs for one piece of content:
    1. all global rules, always;
    2. the best conditional items for each part of the text, merged and ranked.
    """
    chunks = split_into_chunks(text)
    if not chunks:
        return {"global_rules": _fetch_global(org_id), "matches": []}

    # Fetch global rules and embed query chunks concurrently
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_global = executor.submit(_fetch_global, org_id)
        future_vectors = executor.submit(lambda: [to_pgvector(v) for v in embed_queries(chunks)])
        global_rules = future_global.result()
        vectors = future_vectors.result()

    rows = _match_batch(org_id, vectors, TOP_K_PER_CHUNK, min_similarity=min_similarity)

    best: dict[str, dict] = {}
    for row in rows:
        current = best.get(row["id"])
        if current is None or row["similarity"] > current["similarity"]:
            best[row["id"]] = row

    matches = sorted(best.values(), key=lambda r: r["similarity"], reverse=True)[:MAX_CONDITIONAL]
    return {"global_rules": global_rules, "matches": matches}


VISUAL_QUERIES = [
    "logo usage, size, placement and clear space",
    "brand colour palette and colour usage",
    "typography, layout and composition",
    "photography and imagery style",
    "text legibility, colour contrast and accessibility",
]


def retrieve_for_visual(org_id: UUID) -> dict:
    """Global rules plus the rules most relevant to how an image should look."""
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_global = executor.submit(_fetch_global, org_id)
        future_vectors = executor.submit(lambda: [to_pgvector(v) for v in embed_queries(VISUAL_QUERIES)])
        global_rules = future_global.result()
        vectors = future_vectors.result()

    rows = _match_batch(org_id, vectors, 6, item_types=["rule"])

    best: dict[str, dict] = {}
    for row in rows:
        current = best.get(row["id"])
        if current is None or row["similarity"] > current["similarity"]:
            best[row["id"]] = row

    matches = sorted(best.values(), key=lambda r: r["similarity"], reverse=True)[:20]
    return {"global_rules": global_rules, "matches": matches}


def find_rule(
    org_id: UUID, query: str, keywords: list[str], categories: list[str] | None = None
) -> dict | None:
    """
    Finds the approved rule a measurable check depends on. A rule counts only if its
    text contains one of the keywords, so a check is never linked to an unrelated rule.
    """
    wanted = set(categories) if categories else None

    for row in _fetch_global(org_id):
        text = row["content"].lower()
        if row["item_type"] == "rule" and (wanted is None or row["category"] in wanted):
            if any(k in text for k in keywords):
                return row

    vector = to_pgvector(embed_query(query))
    for row in _match(org_id, vector, 6, categories=categories, item_types=["rule"]):
        if any(k in row["content"].lower() for k in keywords):
            return row
    return None