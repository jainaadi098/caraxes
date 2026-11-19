import json
from unittest.mock import MagicMock, patch
from uuid import uuid4
import pytest

from app.services.knowledge_embeddings import embed_and_store
from app.services.knowledge_extraction import extract_knowledge
from app.services.violation_manager import consolidate


def test_embed_and_store_batch_upsert(mock_supabase):
    org_id = uuid4()
    item_id_1 = str(uuid4())
    item_id_2 = str(uuid4())

    mock_rows = [
        {"id": item_id_1, "item_type": "rule", "category": "tone", "title": "Be polite", "content": "Always be polite."},
        {"id": item_id_2, "item_type": "fact", "category": "fact", "title": "Founded", "content": "Founded in 2020."},
    ]

    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    mock_table.select.return_value.in_.return_value.eq.return_value.execute.return_value.data = mock_rows

    with patch("app.services.knowledge_embeddings.embed_documents") as mock_embed:
        mock_embed.return_value = [[0.1] * 768, [0.2] * 768]
        count = embed_and_store(org_id, [item_id_1, item_id_2])

    assert count == 2
    # Verify upsert was called with a batch of rows instead of multiple individual update calls
    mock_table.upsert.assert_called_once()
    upserted_rows = mock_table.upsert.call_args[0][0]
    assert len(upserted_rows) == 2
    assert "embedding" in upserted_rows[0]
    assert "embedding" in upserted_rows[1]


def test_extract_knowledge_mocked(mock_gemini):
    pages = [(1, "Our logo must always have 20px padding. We were founded in 2021.")]

    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "items": [
            {
                "item_type": "rule",
                "category": "visual_consistency",
                "title": "Logo padding",
                "content": "Our logo must always have 20px padding.",
                "source_page": 1,
                "source_excerpt": "Our logo must always have 20px padding.",
                "is_global": False,
                "applies_to": ["logo"],
            }
        ]
    })
    mock_gemini.models.generate_content.return_value = mock_response

    rows = extract_knowledge(pages)
    assert len(rows) == 1
    assert rows[0]["title"] == "Logo padding"
    assert rows[0]["category"] == "visual_consistency"
    assert rows[0]["metadata"]["excerpt_verified"] is True


def test_consolidate_violations():
    raw_findings = [
        {"source": "text", "severity": "medium", "finding_type": "rule_violation", "title": "Word choice", "segment": "bad"},
        {"source": "text", "severity": "high", "finding_type": "rule_violation", "title": "Banned phrase", "segment": "worst"},
    ]
    findings, stats = consolidate(raw_findings)
    assert len(findings) == 2
    assert stats["segment_groups"] == 2
    assert stats["merged_duplicates"] == 0
