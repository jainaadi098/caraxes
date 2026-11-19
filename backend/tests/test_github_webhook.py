import hashlib
import hmac
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient

from app.api.github_webhook import _verify_signature, format_pr_review_markdown
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_verify_signature():
    secret = "my-webhook-secret"
    body = b'{"action": "ping"}'
    valid_sig = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

    assert _verify_signature(secret, body, valid_sig) is True
    assert _verify_signature(secret, body, "sha256=invalid") is False
    assert _verify_signature(secret, body, None) is False
    # If no secret configured, permits requests
    assert _verify_signature("", body, None) is True


def test_format_pr_review_markdown():
    # 1. Clean report with 0 findings
    md_clean, count, high = format_pr_review_markdown({})
    assert count == 0
    assert high == 0
    assert "All brand checks passed" in md_clean

    # 2. Report with issues and suggestions
    findings_map = {
        "docs/intro.md": [
            {
                "severity": "high",
                "finding_type": "rule_violation",
                "segment": "Our competitor is slow.",
                "explanation": "Never attack or demean competitors directly in copy.",
                "suggested_correction": "Our solution is optimized for maximum speed.",
            }
        ]
    }
    md_issues, count, high = format_pr_review_markdown(findings_map)
    assert count == 1
    assert high == 1
    assert "docs/intro.md" in md_issues
    assert "```suggestion" in md_issues
    assert "Our solution is optimized for maximum speed." in md_issues


def test_github_webhook_ping_endpoint(client):
    res = client.post("/webhooks/github", headers={"X-GitHub-Event": "ping"}, json={})
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_github_webhook_pr_event_mocked(client):
    org_id = uuid4()
    payload = {
        "action": "opened",
        "pull_request": {
            "number": 42,
            "title": "Update product launch copy",
            "body": "This PR updates our marketing overview.",
            "head": {"sha": "abc123def456"},
        },
        "repository": {
            "name": "caraxes",
            "owner": {"login": "abhayshroti42"},
        },
    }

    with patch("app.api.github_webhook._resolve_org_id", return_value=org_id), \
         patch("app.api.github_webhook._set_commit_status", new_callable=AsyncMock) as mock_status, \
         patch("app.api.github_webhook._post_pr_review", new_callable=AsyncMock) as mock_review, \
         patch("app.api.github_webhook.collect_text_findings") as mock_findings:

        mock_findings.return_value = ([], {}, {})

        res = client.post(
            "/webhooks/github",
            headers={"X-GitHub-Event": "pull_request"},
            json=payload,
        )

    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["blocking_issues"] == 0
    mock_status.assert_called()
    mock_review.assert_called_once()
