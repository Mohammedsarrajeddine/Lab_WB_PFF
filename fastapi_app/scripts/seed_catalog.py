import asyncio
import json
import os
import sys
from pathlib import Path

# Add the parent directory to sys.path so we can import 'app'
sys.path.append(str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.db.models.catalog import AnalysisCatalogItem, PricingRule, PricingTier
from app.db.session import AsyncSessionLocal

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(BASE_DIR, "data", "catalog_data.json")


async def seed():
    async with AsyncSessionLocal() as session:
        # 1. Seed Pricing Rules
        tiers = {
            PricingTier.CONVENTIONNEL: 1.10,
            PricingTier.NON_CONVENTIONNEL: 1.34,
        }
        for tier, mult in tiers.items():
            rule = await session.scalar(select(PricingRule).where(PricingRule.tier == tier))
            if not rule:
                rule = PricingRule(tier=tier, multiplier=mult)
                session.add(rule)
            else:
                rule.multiplier = mult

        # 2. Seed Catalog Items
        if os.path.exists(JSON_PATH):
            with open(JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)

            for item in data:
                # Build the full synonym set from JSON + auto-generated
                json_synonyms = [s.lower() for s in (item.get("synonyms") or [])]
                auto_synonym = item["name"].lower()
                desired_synonyms = list(dict.fromkeys(
                    [auto_synonym] + json_synonyms
                ))

                db_item = await session.scalar(
                    select(AnalysisCatalogItem).where(AnalysisCatalogItem.code == item["code"])
                )
                if not db_item:
                    db_item = AnalysisCatalogItem(
                        code=item["code"],
                        name=item["name"],
                        coefficient=item["coefficient"],
                        synonyms=desired_synonyms,
                    )
                    session.add(db_item)
                else:
                    db_item.name = item["name"]
                    db_item.coefficient = item["coefficient"]
                    # Merge new synonyms into existing ones (preserve order, no dupes)
                    existing = list(db_item.synonyms or [])
                    merged = list(dict.fromkeys(existing + desired_synonyms))
                    if merged != existing:
                        db_item.synonyms = merged

            await session.commit()
            print(f"✅ Successfully seeded pricing rules and {len(data)} catalog items.")
        else:
            print(f"❌ Could not find {JSON_PATH}. Please run parse_ncb_pdf.py first.")


if __name__ == "__main__":
    asyncio.run(seed())
