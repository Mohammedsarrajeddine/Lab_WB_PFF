from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.catalog import AnalysisCatalogItem, PricingRule, PricingTier


class CatalogRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_all_items(self) -> list[AnalysisCatalogItem]:
        result = await self._session.scalars(
            select(AnalysisCatalogItem).order_by(AnalysisCatalogItem.code)
        )
        return list(result.all())

    async def get_pricing_rules(self) -> dict[PricingTier, PricingRule]:
        result = await self._session.scalars(select(PricingRule))
        return {rule.tier: rule for rule in result.all()}
