from collections import Counter
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.auth import get_org_id
from app.core.supabase_client import get_supabase

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
def get_analytics(org_id: UUID = Depends(get_org_id)):
    """
    Computes brand compliance analytics for the organisation:
    - Compliance score (% of submissions approved or without high severity issues)
    - Total submissions count & status breakdown
    - Findings distribution by category and severity
    - Top 5 violated rules
    - Rule adoption & fix rate
    """
    sb = get_supabase()
    org = str(org_id)

    # 1. Submissions breakdown
    subs = (
        sb.table("content_submissions")
        .select("id, status, content_type, created_by_name, created_at")
        .eq("org_id", org)
        .order("created_at", desc=True)
        .limit(1000)
        .execute()
        .data
        or []
    )
    total_submissions = len(subs)
    status_counts = dict(Counter(s.get("status", "draft") for s in subs))
    approved_count = status_counts.get("approved", 0)

    # 2. Findings & violations
    findings = (
        sb.table("findings")
        .select("id, severity, status, source, knowledge_item_id, segment_text, explanation")
        .eq("org_id", org)
        .limit(2000)
        .execute()
        .data
        or []
    )
    total_findings = len(findings)
    severity_counts = dict(Counter(f.get("severity", "medium") for f in findings))
    finding_status_counts = dict(Counter(f.get("status", "open") for f in findings))
    source_counts = dict(Counter(f.get("source", "deterministic") for f in findings))

    # 3. Knowledge items to map violated rules & categories
    rules = (
        sb.table("knowledge_items")
        .select("id, title, content, category, status")
        .eq("org_id", org)
        .limit(1000)
        .execute()
        .data
        or []
    )
    rule_lookup = {r["id"]: r for r in rules}

    rule_violation_counts = Counter()
    category_violation_counts = Counter()

    for f in findings:
        kid = f.get("knowledge_item_id")
        if kid and kid in rule_lookup:
            rule_violation_counts[kid] += 1
            cat = rule_lookup[kid].get("category", "other")
            category_violation_counts[cat] += 1
        else:
            category_violation_counts["general"] += 1

    top_rules = []
    for kid, count in rule_violation_counts.most_common(5):
        r = rule_lookup[kid]
        top_rules.append(
            {
                "rule_id": kid,
                "title": r.get("title") or r.get("content", "")[:40],
                "category": r.get("category", "terminology"),
                "content": r.get("content", ""),
                "violation_count": count,
            }
        )

    # 4. Overall Compliance Score:
    open_high_count = sum(
        1 for f in findings if f.get("status") == "open" and f.get("severity") == "high"
    )
    fixed_count = sum(
        1 for f in findings if f.get("status") in ("accepted", "fixed")
    )
    fix_rate = round((fixed_count / total_findings * 100), 1) if total_findings > 0 else 100.0

    if total_submissions == 0:
        compliance_score = 100.0
    else:
        evaluated = total_submissions - status_counts.get("draft", 0)
        if evaluated == 0:
            compliance_score = 100.0
        else:
            base = (approved_count / evaluated) * 100.0
            penalty = min(25.0, open_high_count * 2.5)
            compliance_score = max(0.0, round(base - penalty, 1))

    return {
        "compliance_score": compliance_score,
        "total_submissions": total_submissions,
        "approved_submissions": approved_count,
        "status_breakdown": status_counts,
        "total_violations": total_findings,
        "severity_breakdown": {
            "high": severity_counts.get("high", 0),
            "medium": severity_counts.get("medium", 0),
            "low": severity_counts.get("low", 0),
        },
        "finding_status_breakdown": finding_status_counts,
        "category_breakdown": dict(category_violation_counts),
        "source_breakdown": source_counts,
        "fix_rate": fix_rate,
        "top_violated_rules": top_rules,
        "active_rules_count": sum(1 for r in rules if r.get("status") == "approved"),
        "total_rules_count": len(rules),
    }
