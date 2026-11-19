from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Response

from app.core.auth import get_org_id
from app.core.supabase_client import get_supabase
from app.services.vale_exporter import build_vale_zip, generate_vale_files

router = APIRouter(prefix="/vale", tags=["vale"])


def _get_approved_items(org_id: UUID) -> list[dict]:
    sb = get_supabase()
    res = (
        sb.table("knowledge_items")
        .select("id, item_type, category, title, content, is_global, metadata")
        .eq("org_id", str(org_id))
        .eq("status", "approved")
        .execute()
    )
    return res.data or []


def _get_org_name(org_id: UUID) -> str:
    sb = get_supabase()
    res = sb.table("organisations").select("name").eq("id", str(org_id)).limit(1).execute()
    if res.data and res.data[0].get("name"):
        # Make a safe identifier name for Vale style directory
        name = "".join(c for c in res.data[0]["name"] if c.isalnum() or c in ("_", "-"))
        return name or "CaraxesBrand"
    return "CaraxesBrand"


@router.get("/export")
def export_vale_pack(org_id: UUID = Depends(get_org_id)):
    """
    Exports all approved brand knowledge rules as a ready-to-use Vale style pack .zip.
    Includes .vale.ini and YAML rules for Terminology, BannedTerms, and Punctuation.
    """
    items = _get_approved_items(org_id)
    if not items:
        raise HTTPException(
            status_code=400,
            detail="No approved brand knowledge items found. Approve items on the Brand Knowledge page first.",
        )

    brand_name = _get_org_name(org_id)
    zip_bytes = build_vale_zip(items, brand_name=brand_name)

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{brand_name}-vale-rules.zip"',
        },
    )


@router.get("/rules")
def preview_vale_rules(org_id: UUID = Depends(get_org_id)):
    """Previews the generated Vale YAML rules and .vale.ini as JSON."""
    items = _get_approved_items(org_id)
    brand_name = _get_org_name(org_id)
    files = generate_vale_files(items, brand_name=brand_name)
    return {
        "brand_name": brand_name,
        "rule_count": len(items),
        "files": files,
    }
