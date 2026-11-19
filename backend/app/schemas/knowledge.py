from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class KnowledgeItemOut(BaseModel):
    id: UUID
    org_id: UUID
    source_document_id: UUID | None = None
    item_type: str
    category: str
    title: str | None = None
    content: str
    source_page: int | None = None
    source_excerpt: str | None = None
    is_global: bool
    metadata: dict
    status: str
    created_at: datetime
    updated_at: datetime


class KnowledgeItemUpdate(BaseModel):
    title: str | None = None
    content: str | None = Field(default=None, min_length=1)
    category: Literal[
        "tone", "terminology", "messaging", "visual_consistency",
        "accessibility", "promotional_claims", "fact", "tagline",
    ] | None = None
    is_global: bool | None = None


class KnowledgeItemCreate(BaseModel):
    item_type: Literal["rule", "fact", "tagline"] = "rule"
    category: Literal[
        "tone", "terminology", "messaging", "visual_consistency",
        "accessibility", "promotional_claims", "fact", "tagline",
    ]
    title: str | None = None
    content: str = Field(min_length=1)
    is_global: bool = False
    metadata: dict = Field(default_factory=dict)
    auto_approve: bool = True


class RuleTestRequest(BaseModel):
    rule_content: str = Field(min_length=1)
    rule_category: str = "terminology"
    sample_text: str = Field(min_length=1)


class BulkReview(BaseModel):
    ids: list[UUID] = Field(min_length=1)
    action: Literal["approve", "reject"]