from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.catalog_repo import CatalogRepository
from app.db.session import get_db_session
from app.schemas.catalog import AnalysisCatalogItemOut, PricingRuleOut
from app.services.catalog.insurance_profiles import (
    InsuranceProfile,
    list_insurance_profiles,
)

router = APIRouter(tags=["catalog"])


class InsuranceProfileOut(BaseModel):
    """Public-facing insurance profile schema."""
    code: str
    label: str
    label_short: str
    coverage_pct: int
    tiers_payant: bool
    description: str


@router.get("/catalog", response_model=list[AnalysisCatalogItemOut])
async def get_catalog(session: AsyncSession = Depends(get_db_session)):
    repo = CatalogRepository(session)
    items = await repo.get_all_items()
    return items


@router.get("/pricing-rules", response_model=list[PricingRuleOut])
async def get_pricing_rules(session: AsyncSession = Depends(get_db_session)):
    repo = CatalogRepository(session)
    rules_dict = await repo.get_pricing_rules()
    return list(rules_dict.values())


@router.get("/insurance-profiles", response_model=list[InsuranceProfileOut])
async def get_insurance_profiles():
    """Return all available Moroccan insurance profiles."""
    profiles = list_insurance_profiles()
    return [
        InsuranceProfileOut(
            code=p.code,
            label=p.label,
            label_short=p.label_short,
            coverage_pct=p.coverage_pct,
            tiers_payant=p.tiers_payant,
            description=p.description,
        )
        for p in profiles
    ]

