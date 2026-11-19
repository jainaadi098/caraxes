import pytest
from app.services.retrieval import split_into_chunks, CHUNK_CHARS, HARD_SPLIT, MAX_CHUNKS
from app.services.knowledge_extraction import _batches, _norm


def test_split_into_chunks_empty():
    assert split_into_chunks("") == []
    assert split_into_chunks("   \n\n  ") == []


def test_split_into_chunks_short_text():
    text = "Caraxes delivers automated brand governance. It checks visual and textual consistency."
    chunks = split_into_chunks(text)
    assert len(chunks) == 1
    assert "Caraxes delivers" in chunks[0]


def test_split_into_chunks_groups_into_larger_blocks():
    # Sentences should be grouped up to around CHUNK_CHARS (~500 chars)
    sentence = "Our brand guidelines require consistent typography and tone of voice. "
    text = sentence * 15  # ~1050 chars
    chunks = split_into_chunks(text)
    assert len(chunks) > 1
    assert len(chunks) <= MAX_CHUNKS
    for c in chunks:
        assert len(c) <= CHUNK_CHARS + 200  # leeway for sentence boundary


def test_split_into_chunks_hard_split():
    # A single sentence longer than HARD_SPLIT (800) is cut
    long_sentence = "A" * 1200 + "."
    chunks = split_into_chunks(long_sentence)
    assert len(chunks) >= 2


def test_knowledge_extraction_norm():
    assert _norm("  Hello,   WORLD! 123  ") == "hello world 123"
    assert _norm("") == ""


def test_knowledge_extraction_batches():
    pages = [
        (1, "Page one text content."),
        (2, "Page two text content."),
        (3, ""),  # empty page should be skipped
    ]
    batches = _batches(pages)
    assert len(batches) == 1
    assert "=== PAGE 1 ===" in batches[0]
    assert "=== PAGE 2 ===" in batches[0]
    assert "=== PAGE 3 ===" not in batches[0]
