from __future__ import annotations

from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.db.models.catalog import PricingTier

class PricingRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tier: PricingTier
    multiplier: float

class AnalysisCatalogItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    code: str
    name: str
    coefficient: int
    synonyms: list[str]
