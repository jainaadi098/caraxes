from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
import re
from typing import Literal

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.core.config import get_settings

MAX_BATCH_CHARS = 14000  # pages are grouped so each Gemini call stays a manageable size


@lru_cache
def _client() -> genai.Client:
    key = get_settings().gemini_api_key
    if not key:
        raise RuntimeError("GEMINI_API_KEY is empty in backend/.env")
    return genai.Client(api_key=key)

Category = Literal[
    "tone", "terminology", "messaging", "visual_consistency",
    "accessibility", "promotional_claims", "fact", "tagline",
]


# --- The shape Gemini must answer in (no defaults: every field is required) ---
class ExtractedItem(BaseModel):
    item_type: Literal["rule", "fact", "tagline"]
    category: Category
    title: str
    content: str
    source_page: int
    source_excerpt: str
    is_global: bool
    applies_to: list[str]


class ExtractionResult(BaseModel):
    items: list[ExtractedItem]


SYSTEM_PROMPT = """You extract brand knowledge from an organisation's brand-guideline text.
Pages are marked like === PAGE 3 ===.

Return one item per atomic requirement. Split a paragraph that holds several rules into several items.

item_type:
- "rule": something content must or must not do.
- "fact": a verifiable statement about the company or its products (founding year, locations, certifications, product ranges).
- "tagline": an approved slogan or tagline. Put the exact tagline text in content, with its usage conditions in title.

category (for rules): tone, terminology, messaging, visual_consistency, accessibility, promotional_claims.
For facts use "fact". For taglines use "tagline".

Fields:
- title: a short label, 3 to 8 words.
- content: the requirement, written so it can be applied later without the rest of the document. Preserve the document's exact wording of quoted terms.
- source_page: the page number from the marker where the item appears.
- source_excerpt: a short passage copied word for word from that page. Do not paraphrase it.
- is_global: true only for rules that apply to ALL content (for example overall tone, brand-name spelling, universal terminology). False for rules that apply only to a situation: logo use, print, discounts, health claims, particular channels, and all facts and taglines.
- applies_to: short lowercase topic tags saying when the item is relevant (for example ["logo", "print"] or ["discounts", "pricing"]). Use ["all"] for global items.

Strict rules:
- Extract ONLY what the text explicitly states. Never invent, infer or add best practices.
- Do not extract page numbers, headings or table-of-contents lines as items.
- If a page has nothing extractable, return no items for it."""


def _norm(text: str) -> str:
    return re.sub(r"\W+", " ", text.lower()).strip()


def _batches(pages: list[tuple[int, str]]) -> list[str]:
    batches, current, size = [], [], 0
    for number, text in pages:
        if not text.strip():
            continue
        block = f"=== PAGE {number} ===\n{text.strip()}\n"
        if current and size + len(block) > MAX_BATCH_CHARS:
            batches.append("\n".join(current))
            current, size = [], 0
        current.append(block)
        size += len(block)
    if current:
        batches.append("\n".join(current))
    return batches


def extract_knowledge(pages: list[tuple[int, str]]) -> list[dict]:
    """pages = [(page_number, text), ...]. Returns rows ready for knowledge_items."""
    settings = get_settings()
    client = _client()
    page_text = {number: _norm(text) for number, text in pages}

    batches = _batches(pages)
    if not batches:
        return []

    def _process_batch(item: tuple[int, str]) -> tuple[int, list[ExtractedItem]]:
        idx, batch_content = item
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=batch_content,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=ExtractionResult,
            ),
        )
        items = ExtractionResult.model_validate_json(response.text).items
        return idx, items

    indexed_batches = list(enumerate(batches))
    max_workers = min(len(batches), 6)
    if max_workers > 1:
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            batch_results = list(executor.map(_process_batch, indexed_batches))
        batch_results.sort(key=lambda r: r[0])
    else:
        batch_results = [_process_batch(indexed_batches[0])]

    rows: list[dict] = []
    seen: set[str] = set()

    for _, items in batch_results:
        for item in items:
            content = item.content.strip()
            key = _norm(content)
            if not content or key in seen:
                continue  # skip empties and duplicates
            seen.add(key)

            # Facts and taglines always get their own category, whatever Gemini said
            category = item.category
            if item.item_type == "fact":
                category = "fact"
            elif item.item_type == "tagline":
                category = "tagline"
            elif category in ("fact", "tagline"):
                category = "messaging"

            # Traceability check: is the quoted excerpt really on that page?
            excerpt = item.source_excerpt.strip()
            verified = bool(excerpt) and _norm(excerpt) in page_text.get(item.source_page, "")

            rows.append(
                {
                    "item_type": item.item_type,
                    "category": category,
                    "title": item.title.strip()[:200] or None,
                    "content": content,
                    "source_page": item.source_page if item.source_page in page_text else None,
                    "source_excerpt": excerpt or None,
                    "is_global": item.is_global and item.item_type == "rule",
                    "metadata": {"applies_to": item.applies_to, "excerpt_verified": verified},
                    "status": "pending",
                }
            )
    return rows