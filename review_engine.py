"""Backwards-compatibility shim re-exporting services."""

from services.vale_service import check_prose_with_vale as run_vale, VALE_BIN
from services.ai_service import check_compliance_with_ai as run_ai_review, load_knowledge_base
from services.review_service import run_full_review
