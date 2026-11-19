from unittest.mock import MagicMock
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_organisations_get(client, mock_supabase):
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    mock_table.select.return_value.order.return_value.execute.return_value.data = [
        {"id": str(uuid4()), "name": "Acme Corp", "created_at": "2026-11-19T00:00:00Z"}
    ]

    res = client.get("/organisations")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["name"] == "Acme Corp"


def test_submissions_requires_org_header(client):
    # Without X-Org-Id header, should be 401
    res = client.post("/submissions", json={"title": "Draft", "text_content": "Content"})
    assert res.status_code == 401
