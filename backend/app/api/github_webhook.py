import hashlib
import hmac
import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Request, Response
import httpx

from app.core.config import get_settings
from app.core.supabase_client import get_supabase
from app.services.governance import collect_text_findings
from app.services.violation_manager import consolidate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/github", tags=["github webhooks"])

CHECKABLE_EXTENSIONS = (".md", ".mdx", ".txt", ".rst", ".html", ".htm", ".json")
MAX_FILE_BYTES = 500_000  # 500 KB per text file to keep latency bounded


def _verify_signature(secret: str, raw_body: bytes, signature_header: str | None) -> bool:
    """Verifies that the webhook payload was signed by GitHub using HMAC SHA-256."""
    if not secret:
        # If no secret configured, allow for local testing/dev
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False

    expected_sig = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_sig, signature_header)


def _resolve_org_id(repo_name: str) -> UUID | None:
    """Finds the organisation associated with this repository or falls back to default/first org."""
    sb = get_supabase()
    settings = get_settings()

    # 1. Configured default org ID
    if settings.default_org_id:
        try:
            return UUID(settings.default_org_id)
        except ValueError:
            pass

    # 2. Match organisation by repository name
    try:
        res = sb.table("organisations").select("id").ilike("name", f"%{repo_name}%").limit(1).execute()
        if res.data:
            return UUID(res.data[0]["id"])
    except Exception:
        pass

    # 3. Fallback to the first available organisation
    try:
        res = sb.table("organisations").select("id").order("created_at").limit(1).execute()
        if res.data:
            return UUID(res.data[0]["id"])
    except Exception:
        pass

    return None


async def _set_commit_status(
    owner: str,
    repo: str,
    sha: str,
    state: str,
    description: str,
    github_token: str,
    target_url: str | None = None,
) -> None:
    """Updates the commit status check on GitHub (pending, success, failure)."""
    if not github_token:
        return

    url = f"https://api.github.com/repos/{owner}/{repo}/statuses/{sha}"
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Caraxes-Brand-Governance",
    }
    payload: dict[str, Any] = {
        "state": state,
        "context": "Caraxes / Brand Governance",
        "description": description[:140],
    }
    if target_url:
        payload["target_url"] = target_url

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            await client.post(url, json=payload, headers=headers)
        except Exception as e:
            logger.warning("Failed to update GitHub commit status: %s", e)


async def _post_pr_review(
    owner: str,
    repo: str,
    pull_number: int,
    body: str,
    event: str,
    github_token: str,
) -> None:
    """Posts a PR review comment to GitHub with findings and suggestions."""
    if not github_token:
        return

    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}/reviews"
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Caraxes-Brand-Governance",
    }
    payload = {"body": body, "event": event}

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            await client.post(url, json=payload, headers=headers)
        except Exception as e:
            logger.warning("Failed to post GitHub PR review: %s", e)


def format_pr_review_markdown(file_findings: dict[str, list[dict]]) -> tuple[str, int, int]:
    """Formats findings into a professional GitHub markdown review comment."""
    total_findings = sum(len(f) for f in file_findings.values())
    total_high = sum(sum(1 for item in f if item.get("severity") == "high") for f in file_findings.values())

    lines: list[str] = [
        "## 🛡️ Caraxes Brand Governance Report",
        "",
    ]

    if total_findings == 0:
        lines.append("✅ **All brand checks passed.** Copy and documentation strictly comply with approved guidelines.")
        return "\n".join(lines), 0, 0

    lines.append(
        f"Automated brand analysis inspected {len(file_findings)} file(s) and detected **{total_findings} finding(s)** "
        f"({total_high} blocking high-severity issue(s))."
    )
    lines.append("")

    for filename, findings in file_findings.items():
        if not findings:
            continue
        lines.append(f"### 📄 `{filename}` ({len(findings)} issue(s))")
        lines.append("")

        for idx, f in enumerate(findings, start=1):
            severity = f.get("severity", "medium").upper()
            badge = "🔴" if severity == "HIGH" else "🟡" if severity == "MEDIUM" else "🔵"
            finding_type = f.get("finding_type", "rule_violation").replace("_", " ").title()
            segment = f.get("segment", "").strip()
            explanation = f.get("explanation", "").strip()
            correction = f.get("suggested_correction")

            lines.append(f"{badge} **Issue #{idx} — [{severity}] {finding_type}**")
            if segment:
                lines.append(f"> \"{segment}\"")
            if explanation:
                lines.append(f"- **Guideline Feedback**: {explanation}")
            if correction:
                lines.append("")
                lines.append("```suggestion")
                lines.append(correction)
                lines.append("```")
            lines.append("")

    lines.append("---")
    lines.append("*Automated brand governance report by [Caraxes](https://github.com/abhayshroti42/caraxes) • Deterministic Checks + Gemini RAG*")
    return "\n".join(lines), total_findings, total_high


@router.post("")
async def github_webhook_endpoint(
    request: Request,
    x_github_event: str | None = Header(default=None),
    x_hub_signature_256: str | None = Header(default=None),
):
    """
    Receives incoming GitHub webhooks:
    - ping: Healthcheck confirmation
    - pull_request: Runs automated brand checks on modified copy/documentation files
    """
    settings = get_settings()
    raw_body = await request.body()

    # 1. Verify HMAC signature if secret is set
    if not _verify_signature(settings.github_webhook_secret, raw_body, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event = x_github_event or "ping"

    # 2. Ping event handling
    if event == "ping":
        return {"status": "ok", "message": "Caraxes GitHub Webhook is active"}

    # 3. Pull Request governance check
    if event == "pull_request":
        payload = await request.json()
        action = payload.get("action")
        if action not in ("opened", "synchronize", "reopened"):
            return {"status": "ignored", "action": action}

        pr = payload.get("pull_request", {})
        repo = payload.get("repository", {})
        owner = repo.get("owner", {}).get("login", "")
        repo_name = repo.get("name", "")
        pull_number = pr.get("number")
        head_sha = pr.get("head", {}).get("sha", "")

        if not owner or not repo_name or not pull_number or not head_sha:
            return {"status": "error", "message": "Incomplete pull request payload"}

        org_id = _resolve_org_id(repo_name)
        if not org_id:
            logger.warning("No organisation found for repository: %s/%s", owner, repo_name)
            return {"status": "error", "message": "No matching organisation configured"}

        # Set commit status to 'pending'
        await _set_commit_status(
            owner, repo_name, head_sha, "pending",
            "Running Caraxes brand governance analysis...",
            settings.github_token,
        )

        file_findings: dict[str, list[dict]] = {}

        # Fetch modified files if github_token is available
        if settings.github_token:
            headers = {
                "Authorization": f"token {settings.github_token}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Caraxes-Brand-Governance",
            }
            files_url = f"https://api.github.com/repos/{owner}/{repo_name}/pulls/{pull_number}/files"

            async with httpx.AsyncClient(timeout=20.0) as client:
                try:
                    resp = await client.get(files_url, headers=headers)
                    if resp.status_code == 200:
                        files = resp.json()
                        for f in files:
                            filename = f.get("filename", "")
                            raw_url = f.get("raw_url")
                            patch = f.get("patch", "")

                            if not any(filename.lower().endswith(ext) for ext in CHECKABLE_EXTENSIONS):
                                continue

                            # Prefer fetching full raw content, fall back to patch
                            content_to_check = ""
                            if raw_url:
                                file_resp = await client.get(raw_url)
                                if file_resp.status_code == 200 and len(file_resp.content) <= MAX_FILE_BYTES:
                                    content_to_check = file_resp.text
                            if not content_to_check and patch:
                                # Extract added lines (+) from diff patch
                                content_to_check = "\n".join(
                                    line[1:] for line in patch.splitlines() if line.startswith("+") and not line.startswith("+++")
                                )

                            if content_to_check.strip():
                                try:
                                    raw, _, _ = collect_text_findings(org_id, content_to_check)
                                    findings, _ = consolidate(raw)
                                    file_findings[filename] = findings
                                except Exception as err:
                                    logger.warning("Analysis failed for %s: %s", filename, err)
                except Exception as e:
                    logger.warning("Failed to fetch PR files: %s", e)

        # Also check PR title and description
        pr_text = f"{pr.get('title', '')}\n\n{pr.get('body', '')}".strip()
        if pr_text:
            try:
                raw, _, _ = collect_text_findings(org_id, pr_text)
                pr_findings, _ = consolidate(raw)
                if pr_findings:
                    file_findings["PR Title & Description"] = pr_findings
            except Exception as e:
                logger.warning("Analysis failed for PR description: %s", e)

        # Format review report
        review_body, total_findings, high_count = format_pr_review_markdown(file_findings)
        review_event = "REQUEST_CHANGES" if high_count > 0 else "COMMENT"

        # Post review and update status
        await _post_pr_review(owner, repo_name, pull_number, review_body, review_event, settings.github_token)

        final_status = "failure" if high_count > 0 else "success"
        desc = (
            f"Brand checks passed ({total_findings} suggestions)"
            if high_count == 0
            else f"Blocked: {high_count} high-severity brand violation(s) found"
        )
        await _set_commit_status(owner, repo_name, head_sha, final_status, desc, settings.github_token)

        return {
            "status": "completed",
            "findings": total_findings,
            "blocking_issues": high_count,
            "review_event": review_event,
        }

    return {"status": "unhandled_event", "event": event}
