import uuid
from unittest.mock import MagicMock
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_register_company_account(client, mock_supabase):
    org_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())

    # Mock organisation lookup (not found) and insertion (creates new org)
    mock_supabase.table.return_value.select.return_value.ilike.return_value.limit.return_value.execute.return_value.data = []
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": org_id, "name": "NovaBrew Global"}
    ]

    # Mock admin.create_user in auth
    mock_admin_res = MagicMock()
    mock_admin_res.user.id = user_id
    mock_admin_res.user.email = "founder@novabrew.com"
    mock_supabase.auth.admin.create_user.return_value = mock_admin_res

    # Mock sign_in_with_password for session retrieval
    mock_login_res = MagicMock()
    mock_login_res.session.access_token = "jwt-access-token-123"
    mock_supabase.auth.sign_in_with_password.return_value = mock_login_res

    res = client.post(
        "/auth/register",
        json={
            "email": "founder@novabrew.com",
            "password": "securepassword123",
            "full_name": "Oliver Vance",
            "company_name": "NovaBrew Global",
            "role": "admin",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["access_token"] == "jwt-access-token-123"
    assert data["user"]["email"] == "founder@novabrew.com"
    assert data["user"]["full_name"] == "Oliver Vance"
    assert data["user"]["org_name"] == "NovaBrew Global"
    assert data["user"]["role"] == "admin"


def test_login_success(client, mock_supabase):
    org_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())

    # Mock successful auth response
    mock_auth_res = MagicMock()
    mock_auth_res.user.id = user_id
    mock_auth_res.user.email = "admin@acmecorp.com"
    mock_auth_res.session.access_token = "jwt-session-token-456"
    mock_supabase.auth.sign_in_with_password.return_value = mock_auth_res

    # Mock profile and organisation lookups
    def table_router(table_name):
        mock_builder = MagicMock()
        if table_name == "profiles":
            mock_builder.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
                {"org_id": org_id, "role": "admin", "full_name": "Jane Acme"}
            ]
        elif table_name == "organisations":
            mock_builder.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
                {"id": org_id, "name": "Acme Corporation"}
            ]
        return mock_builder

    mock_supabase.table.side_effect = table_router

    res = client.post(
        "/auth/login",
        json={"email": "admin@acmecorp.com", "password": "correctpassword"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["access_token"] == "jwt-session-token-456"
    assert data["user"]["email"] == "admin@acmecorp.com"
    assert data["user"]["org_name"] == "Acme Corporation"
    assert data["user"]["full_name"] == "Jane Acme"


def test_login_invalid_credentials(client, mock_supabase):
    mock_supabase.auth.sign_in_with_password.side_effect = Exception("Invalid login credentials")

    res = client.post(
        "/auth/login",
        json={"email": "baduser@domain.com", "password": "wrongpassword"},
    )
    assert res.status_code == 401
    assert "Invalid registered email or password" in res.json()["detail"]


def test_send_and_verify_otp_passwordless(client, mock_supabase):
    org_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())

    # 1. Test Send OTP
    send_res = client.post("/auth/send-otp", json={"email": "forgot@company.com"})
    assert send_res.status_code == 200
    assert send_res.json()["success"] is True

    # 2. Test Verify OTP
    mock_verify_res = MagicMock()
    mock_verify_res.user.id = user_id
    mock_verify_res.user.email = "forgot@company.com"
    mock_verify_res.session.access_token = "otp-jwt-token-789"
    mock_supabase.auth.verify_otp.return_value = mock_verify_res

    def table_router(table_name):
        mock_builder = MagicMock()
        if table_name == "profiles":
            mock_builder.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
                {"org_id": org_id, "role": "reviewer", "full_name": "Sam Reviewer"}
            ]
        elif table_name == "organisations":
            mock_builder.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
                {"id": org_id, "name": "Acme Brand"}
            ]
        return mock_builder

    mock_supabase.table.side_effect = table_router

    verify_res = client.post(
        "/auth/verify-otp",
        json={"email": "forgot@company.com", "token": "123456"},
    )
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["access_token"] == "otp-jwt-token-789"
    assert data["user"]["full_name"] == "Sam Reviewer"
    assert data["user"]["org_name"] == "Acme Brand"


def test_verify_otp_invalid(client, mock_supabase):
    mock_supabase.auth.verify_otp.side_effect = Exception("Token expired")

    res = client.post(
        "/auth/verify-otp",
        json={"email": "user@domain.com", "token": "000000"},
    )
    assert res.status_code == 401
    assert "Invalid or expired authentication code" in res.json()["detail"]


def test_get_current_user_profile(client, mock_supabase):
    org_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())

    # Mock user returned by sb.auth.get_user
    mock_user = MagicMock()
    mock_user.id = user_id
    mock_user.email = "current@company.com"
    mock_supabase.auth.get_user.return_value.user = mock_user

    # Mock profiles and organisations table lookup
    def table_router(table_name):
        mock_builder = MagicMock()
        if table_name == "profiles":
            mock_builder.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
                {"org_id": org_id, "role": "admin", "full_name": "Active User"}
            ]
        elif table_name == "organisations":
            mock_builder.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
                {"id": org_id, "name": "Company HQ"}
            ]
        return mock_builder

    mock_supabase.table.side_effect = table_router

    res = client.get("/auth/me", headers={"Authorization": "Bearer valid-test-token"})
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Active User"
    assert data["org_name"] == "Company HQ"
    assert data["role"] == "admin"
