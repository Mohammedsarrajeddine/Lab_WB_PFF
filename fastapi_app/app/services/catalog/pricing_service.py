import difflib

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.catalog import PricingTier
from app.db.repositories.catalog_repo import CatalogRepository
from app.services.catalog.insurance_profiles import (
    InsuranceProfile,
    get_insurance_profile,
)

# Standard Moroccan lab prélèvement coefficient (Pc 1.5 = 1.5 × 10 = 15 B)
_PRELEVEMENT_COEFFICIENT = 15


class PricingService:
    def __init__(self, session: AsyncSession):
        self._repo = CatalogRepository(session)
        self._catalog = None
        self._rules = None

    async def _load_cache(self):
        if self._catalog is None:
            self._catalog = await self._repo.get_all_items()
            self._rules = await self._repo.get_pricing_rules()

    async def estimate_price(
        self,
        extracted_names: list[str] | None,
        tier: PricingTier,
        *,
        insurance_code: str | None = None,
    ) -> dict:
        """Match extracted analysis names against the DB catalog and compute total.

        When *insurance_code* is provided the tier is **overridden** by the
        insurance profile's configured tier, and the response includes an
        insurance coverage breakdown (insurance_covers_dh / patient_pays_dh).
        """
        await self._load_cache()

        # Resolve insurance profile
        profile: InsuranceProfile = get_insurance_profile(insurance_code)
        effective_tier = profile.tier if insurance_code else tier

        # Resolve multiplier for the effective tier
        multiplier = 1.34  # fallback
        if self._rules and effective_tier in self._rules:
            multiplier = float(self._rules[effective_tier].multiplier)

        itemized: list[dict] = []
        total = 0.0

        # Build a searchable map with synonyms mapped to actual items
        search_map: dict[str, object] = {}
        for item in self._catalog:
            search_map[item.name.lower()] = item
            for syn in item.synonyms or []:
                search_map[syn.lower()] = item

        all_keys = list(search_map.keys())
        matched_codes: set[str] = set()

        for raw_name in (extracted_names or []):
            name_lower = raw_name.lower().strip()
            # Try exact match first
            if name_lower in search_map:
                matched_item = search_map[name_lower]
            else:
                # Fuzzy match — lowered cutoff to catch short abbreviations
                matches = difflib.get_close_matches(name_lower, all_keys, n=1, cutoff=0.55)
                if matches:
                    matched_item = search_map[matches[0]]
                else:
                    matched_item = None

            if matched_item:
                price = float(matched_item.coefficient) * multiplier
                itemized.append({
                    "code": matched_item.code,
                    "name": matched_item.name,
                    "price_dh": round(price, 2),
                    "matched_from": raw_name,
                })
                total += price
                matched_codes.add(matched_item.code)
            else:
                # Unmatched
                itemized.append({
                    "code": None,
                    "name": raw_name,
                    "price_dh": 0.0,
                    "matched_from": raw_name,
                })

        # Add prélèvement fee if at least one blood analysis was matched
        prelevement_dh = 0.0
        if matched_codes:
            prelevement_dh = round(_PRELEVEMENT_COEFFICIENT * multiplier, 2)
            total += prelevement_dh

        total = round(total, 2)

        # Insurance coverage breakdown
        coverage_pct = profile.coverage_pct
        insurance_covers_dh = round(total * coverage_pct / 100, 2)
        patient_pays_dh = round(total - insurance_covers_dh, 2)

        return {
            "tier": str(effective_tier.value),
            "insurance_code": profile.code,
            "insurance_label": profile.label_short,
            "coverage_pct": coverage_pct,
            "tiers_payant": profile.tiers_payant,
            "itemized_prices": itemized,
            "prelevement_dh": prelevement_dh,
            "estimated_total_dh": total,
            "insurance_covers_dh": insurance_covers_dh,
            "patient_pays_dh": patient_pays_dh,
        }
