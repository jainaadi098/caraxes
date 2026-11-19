from app.core.supabase_client import get_supabase
from app.services.embeddings import embed_documents, item_text, to_pgvector


def embed_and_store(org_id, ids: list[str]) -> int:
    """Generate embeddings for the given items and save them in batch. Returns how many were done."""
    if not ids:
        return 0
    sb = get_supabase()
    rows = (
        sb.table("knowledge_items")
        .select("*")
        .in_("id", ids)
        .eq("org_id", str(org_id))
        .execute()
        .data
    )
    if not rows:
        return 0

    vectors = embed_documents([item_text(r) for r in rows])
    for row, vec in zip(rows, vectors):
        row["embedding"] = to_pgvector(vec)

    # Single batch upsert request replaces N individual network round-trips
    BATCH_SIZE = 100
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        sb.table("knowledge_items").upsert(batch).execute()

    return len(rows)