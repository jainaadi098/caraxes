from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from uuid import UUID

from app.core.config import get_settings
from app.core.supabase_client import get_supabase
from app.services.analysis import NoKnowledgeError, _set_submission_status, load_analysis
from app.services.correction_engine import build_correction
from app.services.image_analysis import collect_image_findings
from app.services.pdf_extractor import extract_pdf_pages
from app.services.retrieval import find_rule, retrieve_for_content
from app.services.violation_manager import consolidate, save_findings
from app.validators.deterministic_text import check_all_caps, check_exclamations, parse_max_count
from app.validators.text_validator import analyze_text

MAX_PDF_PAGES = 10
MAX_PDF_CHARS = 8000
CAPS_KEYWORDS = ["capital letters", "all caps", "all-caps", "uppercase", "capitals"]


def _load_text(submission: dict) -> tuple[str, list[tuple[int, int]] | None, bool]:
    """Returns (text, [(page, start offset)] for PDFs, truncated?)."""
    if submission["content_type"] == "text":
        return submission["text_content"], None, False

    pdf = get_supabase().storage.from_(get_settings().supabase_bucket).download(
        submission["storage_path"]
    )
    parts: list[str] = []
    starts: list[tuple[int, int]] = []
    position = 0
    for page in extract_pdf_pages(pdf)[:MAX_PDF_PAGES]:
        page_text = page.text.strip()
        if not page_text:
            continue
        if parts:
            position += 2  # the blank line between pages
        starts.append((page.page_number, position))
        parts.append(page_text)
        position += len(page_text)

    text = "\n\n".join(parts)
    if not text.strip():
        raise ValueError("No readable text was found in this PDF")
    return text[:MAX_PDF_CHARS], starts, len(text) > MAX_PDF_CHARS


def collect_text_findings(org_id: UUID, text: str) -> tuple[list[dict], dict, dict]:
    """LLM text validator plus Python counting checks run concurrently."""
    retrieved = retrieve_for_content(org_id, text)
    if not retrieved["global_rules"] and not retrieved["matches"]:
        raise NoKnowledgeError(
            "No approved brand knowledge found. Approve items on the brand knowledge page first."
        )

    def _run_llm():
        return analyze_text(text, retrieved)

    def _run_deterministic():
        det_findings: list[dict] = []
        checks: dict[str, str] = {}
        det_config: dict = {"exclamation_max": None, "all_caps": False}

        excl_rule = find_rule(org_id, "limit on exclamation marks in content", ["exclamation"])
        if excl_rule is None:
            checks["exclamation_marks"] = "skipped: no approved exclamation rule"
        else:
            limit = parse_max_count(excl_rule["content"])
            det_config["exclamation_max"] = limit
            for f in check_exclamations(text, limit):
                det_findings.append(
                    {**f, "knowledge_item_id": excl_rule["id"], "finding_type": "rule_violation", "source": "deterministic"}
                )
            checks["exclamation_marks"] = f"ran (maximum {limit})"

        caps_rule = find_rule(org_id, "never write whole sentences in capital letters", CAPS_KEYWORDS)
        if caps_rule is None:
            checks["all_caps"] = "skipped: no approved capital-letters rule"
        else:
            det_config["all_caps"] = True
            for f in check_all_caps(text):
                det_findings.append(
                    {**f, "knowledge_item_id": caps_rule["id"], "finding_type": "rule_violation", "source": "deterministic"}
                )
            checks["all_caps"] = "ran"

        return det_findings, checks, det_config

    with ThreadPoolExecutor(max_workers=2) as executor:
        future_llm = executor.submit(_run_llm)
        future_det = executor.submit(_run_deterministic)
        llm_findings, dropped = future_llm.result()
        det_findings, checks, det_config = future_det.result()

    collected = [{**f, "source": "text"} for f in llm_findings] + det_findings

    context = {
        "global_rules_used": len(retrieved["global_rules"]),
        "conditional_items_used": len(retrieved["matches"]),
        "checks": checks,
        "det_config": det_config,
        "discarded_invalid": dropped,
    }
    return collected, context, retrieved


def run_governance(org_id: UUID, submission: dict) -> dict:
    sb = get_supabase()
    org = str(org_id)

    analysis = (
        sb.table("analyses")
        .insert(
            {
                "org_id": org,
                "submission_id": submission["id"],
                "version_no": submission["current_version"],
                "status": "running",
            }
        )
        .execute()
        .data[0]
    )
    _set_submission_status(submission["id"], org, "analyzing")

    try:
        text, page_starts, truncated = None, None, False

        # 1. Run every validator that applies to this kind of content
        if submission["content_type"] == "image":
            raw, context, retrieved = collect_image_findings(org_id, submission)
        else:
            text, page_starts, truncated = _load_text(submission)
            raw, context, retrieved = collect_text_findings(org_id, text)

        # 2. Violation Manager: merge, group, order
        findings, stats = consolidate(raw)

        # 3. PDFs: record which page each finding is on
        if page_starts:
            for f in findings:
                loc = f.get("location") or {}
                if isinstance(loc.get("start"), int) and loc["start"] >= 0:
                    loc["page"] = max(
                        (number for number, start in page_starts if start <= loc["start"]),
                        default=None,
                    )
                    f["location"] = loc

        # 4. Correction Engine (text and PDF). A failure here must not lose the findings.
        correction, correction_error = None, None
        if text and findings:
            try:
                correction = build_correction(text, findings, retrieved, context.get("det_config", {}))
            except Exception as e:
                correction_error = str(e)[:300]

        # 5. Save
        save_findings(org, analysis["id"], findings)

        summary = {
            "total": len(findings),
            "by_source": dict(Counter(f["source"] for f in findings)),
            "by_severity": dict(Counter(f["severity"] for f in findings)),
            "by_type": dict(Counter(f["finding_type"] for f in findings)),
            **stats,
            **context,
            "truncated": truncated,
            "analyzed_text": text,
        }
        if correction:
            summary["correction"] = correction
        if correction_error:
            summary["correction_error"] = correction_error

        sb.table("analyses").update({"status": "completed", "summary": summary}).eq(
            "id", analysis["id"]
        ).execute()
        _set_submission_status(submission["id"], org, "in_review")

    except Exception as e:
        sb.table("analyses").update(
            {"status": "failed", "summary": {"error": str(e)[:500]}}
        ).eq("id", analysis["id"]).execute()
        _set_submission_status(submission["id"], org, "draft")
        raise

    return load_analysis(analysis["id"], org)