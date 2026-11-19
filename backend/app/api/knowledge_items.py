from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import get_org_id
from app.core.supabase_client import get_supabase
from app.schemas.knowledge import (
    BulkReview,
    KnowledgeItemCreate,
    KnowledgeItemOut,
    KnowledgeItemUpdate,
    RuleTestRequest,
)
from app.services.knowledge_embeddings import embed_and_store
from app.services.vale_engine import evaluate_vale_rules

router = APIRouter(prefix="/knowledge-items", tags=["knowledge items"])

# Explicit columns so the large embedding vector is never sent to the browser
COLUMNS = (
    "id, org_id, source_document_id, item_type, category, title, content, "
    "source_page, source_excerpt, is_global, metadata, status, created_at, updated_at"
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean(row: dict) -> dict:
    return {k: v for k, v in row.items() if k != "embedding"}


def _set_status(ids: list[str], org_id: UUID, status: str) -> list[dict]:
    return (
        get_supabase()
        .table("knowledge_items")
        .update({"status": status, "updated_at": _now()})
        .in_("id", ids)
        .eq("org_id", str(org_id))
        .execute()
        .data
    )


def _approve(ids: list[str], org_id: UUID) -> list[dict]:
    # Embed BEFORE approving: if embedding fails, items stay pending
    try:
        embed_and_store(org_id, ids)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not generate embeddings: {e}")
    return _set_status(ids, org_id, "approved")


@router.get("", response_model=list[KnowledgeItemOut])
def list_items(
    status: str | None = None,
    category: str | None = None,
    item_type: str | None = None,
    document_id: UUID | None = None,
    org_id: UUID = Depends(get_org_id),
):
    q = get_supabase().table("knowledge_items").select(COLUMNS).eq("org_id", str(org_id))
    if status:
        q = q.eq("status", status)
    if category:
        q = q.eq("category", category)
    if item_type:
        q = q.eq("item_type", item_type)
    if document_id:
        q = q.eq("source_document_id", str(document_id))
    return q.order("source_page").order("created_at").execute().data


@router.post("", response_model=KnowledgeItemOut, status_code=201)
def create_item(payload: KnowledgeItemCreate, org_id: UUID = Depends(get_org_id)):
    """
    Creates a new custom brand knowledge item or rule directly.
    If auto_approve is True, automatically sets status to approved and generates embeddings.
    """
    now = _now()
    initial_status = "approved" if payload.auto_approve else "pending"
    row_data = {
        "org_id": str(org_id),
        "item_type": payload.item_type,
        "category": payload.category,
        "title": payload.title or payload.content[:40],
        "content": payload.content,
        "is_global": payload.is_global,
        "metadata": payload.metadata,
        "status": initial_status,
        "created_at": now,
        "updated_at": now,
    }
    res = get_supabase().table("knowledge_items").insert(row_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create knowledge item")
    created = res.data[0]

    if payload.auto_approve:
        try:
            embed_and_store(org_id, [created["id"]])
        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"Item created, but embedding generation failed: {e}",
            )
    return _clean(created)


@router.post("/test")
def test_rule(payload: RuleTestRequest, org_id: UUID = Depends(get_org_id)):
    """
    Live sandbox rule tester: evaluates a draft rule against sample text
    using deterministic Vale evaluation and keyword extraction without persisting anything.
    """
    mock_item = {
        "content": payload.rule_content,
        "category": payload.rule_category,
        "item_type": "rule",
    }
    # If evaluate_vale_rules found a violation:
    findings = evaluate_vale_rules(payload.sample_text, [mock_item])
    if findings:
        f = findings[0]
        return {
            "matches": True,
            "method": "deterministic",
            "detected_segment": f.get("segment"),
            "suggested_correction": f.get("suggested_correction"),
            "explanation": f.get("explanation"),
        }

    return {
        "matches": False,
        "method": "none",
        "detected_segment": None,
        "suggested_correction": None,
        "explanation": "No rule violations detected in the sample text.",
    }


@router.delete("/{item_id}")
def delete_item(item_id: UUID, org_id: UUID = Depends(get_org_id)):
    """Deletes a brand knowledge item."""
    res = (
        get_supabase()
        .table("knowledge_items")
        .delete()
        .eq("id", str(item_id))
        .eq("org_id", str(org_id))
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"deleted": True, "id": str(item_id)}


@router.patch("/{item_id}", response_model=KnowledgeItemOut)
def update_item(item_id: UUID, payload: KnowledgeItemUpdate, org_id: UUID = Depends(get_org_id)):
    changes = payload.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(status_code=400, detail="Nothing to update")
    changes["updated_at"] = _now()
    res = (
        get_supabase()
        .table("knowledge_items")
        .update(changes)
        .eq("id", str(item_id))
        .eq("org_id", str(org_id))
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Item not found")
    row = res.data[0]

    # An approved item whose wording changed must be searchable by its NEW wording
    if row["status"] == "approved" and {"title", "content", "category"} & set(changes):
        try:
            embed_and_store(org_id, [str(item_id)])
        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"Saved, but embedding failed: {e}. Run POST /knowledge-items/reembed?all=true later.",
            )
    return _clean(row)


@router.post("/{item_id}/approve", response_model=KnowledgeItemOut)
def approve_item(item_id: UUID, org_id: UUID = Depends(get_org_id)):
    rows = _approve([str(item_id)], org_id)
    if not rows:
        raise HTTPException(status_code=404, detail="Item not found")
    return _clean(rows[0])


@router.post("/{item_id}/reject", response_model=KnowledgeItemOut)
def reject_item(item_id: UUID, org_id: UUID = Depends(get_org_id)):
    rows = _set_status([str(item_id)], org_id, "rejected")
    if not rows:
        raise HTTPException(status_code=404, detail="Item not found")
    return _clean(rows[0])


@router.post("/bulk-review")
def bulk_review(payload: BulkReview, org_id: UUID = Depends(get_org_id)):
    ids = [str(i) for i in payload.ids]
    if payload.action == "approve":
        rows = _approve(ids, org_id)
        status = "approved"
    else:
        rows = _set_status(ids, org_id, "rejected")
        status = "rejected"
    return {"updated": len(rows), "status": status}


@router.post("/reembed")
def reembed(all_items: bool = Query(False, alias="all"), org_id: UUID = Depends(get_org_id)):
    """
    Generates embeddings for approved items that don't have one yet, e.g. items
    approved on Day 2 before embeddings existed. Use ?all=true to redo every
    approved item (needed if you ever change the embedding model).
    """
    q = (
        get_supabase()
        .table("knowledge_items")
        .select("id")
        .eq("org_id", str(org_id))
        .eq("status", "approved")
    )
    if not all_items:
        q = q.is_("embedding", "null")
    ids = [r["id"] for r in q.execute().data]

    done = 0
    try:
        for i in range(0, len(ids), 50):
            done += embed_and_store(org_id, ids[i : i + 50])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Embedding failed after {done} items: {e}")
    return {"embedded": done}