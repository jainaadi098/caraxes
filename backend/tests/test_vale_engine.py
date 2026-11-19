import io
from unittest.mock import MagicMock
from uuid import uuid4
import zipfile
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.correction_engine import generate_hybrid_autofix
from app.services.vale_engine import (
    apply_deterministic_substitutions,
    evaluate_vale_rules,
    generate_unified_diff,
)
from app.services.vale_exporter import (
    _parse_forbidden_tokens,
    _parse_substitutions,
    build_vale_zip,
    generate_vale_files,
)


@pytest.fixture
def client():
    return TestClient(app)


def test_parse_substitutions():
    items = [
        {"category": "terminology", "content": "Use 'sign in' instead of 'login'."},
        {"category": "terminology", "content": "Write 'website' rather than 'web site'."},
        {"category": "tone", "content": "Say 'hello', not 'sup'."},
    ]
    swaps = _parse_substitutions(items)
    assert swaps.get("login") == "sign in"
    assert swaps.get("web site") == "website"
    assert swaps.get("sup") == "hello"


def test_parse_forbidden_tokens():
    items = [
        {"category": "tone", "content": "Never use 'synergy' in press releases."},
        {"category": "promotional_claims", "content": "Avoid using 'miracle cure' in claims."},
    ]
    banned = _parse_forbidden_tokens(items)
    assert "synergy" in banned
    assert "miracle cure" in banned


def test_generate_vale_files_and_zip():
    items = [
        {"category": "terminology", "content": "Use 'sign in' instead of 'login'."},
        {"category": "tone", "content": "Avoid using 'synergy' in copy."},
        {"category": "tone", "content": "Never use more than 1 exclamation mark."},
    ]
    files = generate_vale_files(items, brand_name="Acme")
    assert ".vale.ini" in files
    assert "styles/Acme/Terminology.yml" in files
    assert "styles/Acme/BannedTerms.yml" in files
    assert "styles/Acme/Exclamations.yml" in files
    assert "BasedOnStyles = Acme" in files[".vale.ini"]

    # Verify zip output
    zip_bytes = build_vale_zip(items, brand_name="Acme")
    zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    namelist = zf.namelist()
    assert ".vale.ini" in namelist
    assert "styles/Acme/Terminology.yml" in namelist


def test_evaluate_vale_rules():
    items = [
        {"category": "terminology", "content": "Use 'sign in' instead of 'login'."},
        {"category": "tone", "content": "Avoid using 'synergy' in copy."},
    ]
    text = "Please login to achieve corporate synergy today."
    findings = evaluate_vale_rules(text, items)

    assert len(findings) == 2
    # Verify terminology finding has suggested correction and offset
    term_finding = next(f for f in findings if f["rule"] == "Brand.Terminology")
    assert term_finding["segment"] == "login"
    assert term_finding["suggested_correction"] == "sign in"
    assert term_finding["location"]["start"] == 7
    assert term_finding["location"]["end"] == 12

    # Verify banned word finding
    banned_finding = next(f for f in findings if f["rule"] == "Brand.BannedTerms")
    assert banned_finding["segment"] == "synergy"


def test_apply_deterministic_substitutions():
    text = "Click to login now."
    findings = [
        {
            "segment": "login",
            "suggested_correction": "sign in",
            "rule": "Brand.Terminology",
            "location": {"start": 9, "end": 14},
        }
    ]
    corrected, changes = apply_deterministic_substitutions(text, findings)
    assert corrected == "Click to sign in now."
    assert len(changes) == 1
    assert changes[0]["original"] == "login"
    assert changes[0]["replacement"] == "sign in"


def test_generate_unified_diff():
    original = "Hello world.\nPlease login.\n"
    corrected = "Hello world.\nPlease sign in.\n"
    diff = generate_unified_diff(original, corrected)
    assert "-Please login." in diff
    assert "+Please sign in." in diff


def test_generate_hybrid_autofix_fast_path():
    text = "Please login immediately."
    findings = [
        {
            "source": "deterministic",
            "segment": "login",
            "suggested_correction": "sign in",
            "location": {"start": 7, "end": 12},
        }
    ]
    res = generate_hybrid_autofix(text, findings, {"global_rules": [], "matches": []}, {})
    assert res["method"] == "deterministic_vale"
    assert res["corrected_text"] == "Please sign in immediately."
    assert "+Please sign in immediately." in res["unified_diff"]


def test_vale_api_endpoints(client, mock_supabase):
    org_id = str(uuid4())
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table

    # Mock organisations query
    mock_table.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"name": "NovaBrew"}
    ]
    # Mock knowledge_items query
    mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {
            "id": str(uuid4()),
            "category": "terminology",
            "item_type": "rule",
            "title": "Login rule",
            "content": "Use 'sign in' instead of 'login'.",
            "is_global": True,
            "metadata": {},
        }
    ]

    # Test /vale/rules preview
    res = client.get("/vale/rules", headers={"X-Org-Id": org_id})
    assert res.status_code == 200
    data = res.json()
    assert data["brand_name"] == "NovaBrew"
    assert ".vale.ini" in data["files"]

    # Test /vale/export zip download
    res_zip = client.get("/vale/export", headers={"X-Org-Id": org_id})
    assert res_zip.status_code == 200
    assert res_zip.headers["content-type"] == "application/zip"
    zf = zipfile.ZipFile(io.BytesIO(res_zip.content))
    assert ".vale.ini" in zf.namelist()
