import os
from pathlib import Path
import sys
from unittest.mock import MagicMock, patch
import pytest

# Ensure backend root directory is on sys.path so 'app' is always importable
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Ensure required environment variables exist for tests before any app module is loaded
os.environ.setdefault("SUPABASE_URL", "https://mock.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "mock-service-key")
os.environ.setdefault("SUPABASE_BUCKET", "caraxes-files")
os.environ.setdefault("GEMINI_API_KEY", "mock-gemini-key")
os.environ.setdefault("OCR_BACKEND", "gemini")


@pytest.fixture(autouse=True)
def mock_supabase():
    mock_client = MagicMock()
    with patch("app.core.supabase_client.get_supabase", return_value=mock_client), \
         patch("app.core.auth.get_supabase", return_value=mock_client), \
         patch("app.api.organisations.get_supabase", return_value=mock_client), \
         patch("app.api.submissions.get_supabase", return_value=mock_client), \
         patch("app.api.health.get_supabase", return_value=mock_client), \
         patch("app.api.dashboard.get_supabase", return_value=mock_client), \
         patch("app.api.findings.get_supabase", return_value=mock_client), \
         patch("app.services.knowledge_embeddings.get_supabase", return_value=mock_client), \
         patch("app.services.governance.get_supabase", return_value=mock_client), \
         patch("app.services.retrieval.get_supabase", return_value=mock_client), \
         patch("app.services.analysis.get_supabase", return_value=mock_client), \
         patch("app.services.violation_manager.get_supabase", return_value=mock_client), \
         patch("app.api.vale.get_supabase", return_value=mock_client), \
         patch("app.api.knowledge_items.get_supabase", return_value=mock_client), \
         patch("app.api.analytics.get_supabase", return_value=mock_client), \
         patch("app.api.auth.get_supabase", return_value=mock_client):
        yield mock_client


@pytest.fixture
def mock_gemini():
    with patch("app.services.knowledge_extraction._client") as mock_extract_client, \
         patch("app.services.embeddings._client") as mock_embed_client:
        mock_instance = MagicMock()
        mock_extract_client.return_value = mock_instance
        mock_embed_client.return_value = mock_instance
        yield mock_instance
