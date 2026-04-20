"""Moroccan insurance provider profiles.

Real-world data based on Morocco's AMO (Assurance Maladie Obligatoire) system:
- Tarification nationale de référence: Arrêté n° 1796-03 (21 juillet 2005)
- Valeur de la lettre clé B: 1.10 DH (conventionné) / 1.34 DH (hors convention)
- CNOPS coverage: 80% (Décret n° 2-05-733)
- CNSS/AMO coverage: 70% standard ambulatory (Loi 65-00)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

from app.db.models.catalog import PricingTier


@dataclass(frozen=True, slots=True)
class InsuranceProfile:
    """Immutable insurance provider configuration."""

    code: str
    label: str
    label_short: str
    tier: PricingTier
    coverage_pct: int  # 0-100
    tiers_payant: bool
    description: str


# ---------------------------------------------------------------------------
# Real Moroccan insurance profiles
# ---------------------------------------------------------------------------

CNOPS = InsuranceProfile(
    code="cnops",
    label="CNOPS — Mutuelle du secteur public",
    label_short="CNOPS",
    tier=PricingTier.CONVENTIONNEL,
    coverage_pct=80,
    tiers_payant=True,
    description=(
        "Caisse Nationale des Organismes de Prévoyance Sociale. "
        "Couvre les fonctionnaires et agents de l'État. "
        "Remboursement à 80% du tarif conventionnel (B = 1.10 DH). "
        "Tiers payant pour actes > B60 (66 DH)."
    ),
)

CNSS = InsuranceProfile(
    code="cnss",
    label="CNSS — AMO secteur privé",
    label_short="CNSS",
    tier=PricingTier.CONVENTIONNEL,
    coverage_pct=70,
    tiers_payant=True,
    description=(
        "Caisse Nationale de Sécurité Sociale. "
        "Couvre les salariés du secteur privé. "
        "Remboursement à 70% du tarif conventionnel (B = 1.10 DH)."
    ),
)

AXA = InsuranceProfile(
    code="axa",
    label="AXA Assurance Maroc",
    label_short="AXA",
    tier=PricingTier.CONVENTIONNEL,
    coverage_pct=80,
    tiers_payant=True,
    description=(
        "Assurance complémentaire privée. "
        "Remboursement standard à 80% du tarif conventionnel. "
        "Taux réel dépend du contrat souscrit (70-100%)."
    ),
)

RMA = InsuranceProfile(
    code="rma",
    label="RMA Watanya",
    label_short="RMA",
    tier=PricingTier.CONVENTIONNEL,
    coverage_pct=80,
    tiers_payant=True,
    description=(
        "Royale Marocaine d'Assurance. "
        "Remboursement standard à 80% du tarif conventionnel. "
        "Taux réel dépend du contrat souscrit (70-100%)."
    ),
)

PAYANT = InsuranceProfile(
    code="payant",
    label="Payant — Sans assurance",
    label_short="Payant",
    tier=PricingTier.NON_CONVENTIONNEL,
    coverage_pct=0,
    tiers_payant=False,
    description=(
        "Patient sans couverture médicale. "
        "Tarif hors convention (B = 1.34 DH). "
        "Totalité à la charge du patient."
    ),
)


# ---------------------------------------------------------------------------
# Lookup registry
# ---------------------------------------------------------------------------

INSURANCE_PROFILES: Final[dict[str, InsuranceProfile]] = {
    p.code: p for p in (CNOPS, CNSS, AXA, RMA, PAYANT)
}

DEFAULT_INSURANCE_CODE: Final[str] = "payant"


def get_insurance_profile(code: str | None) -> InsuranceProfile:
    """Return the profile for the given code, falling back to PAYANT."""
    if not code:
        return PAYANT
    return INSURANCE_PROFILES.get(code.lower().strip(), PAYANT)


def list_insurance_profiles() -> list[InsuranceProfile]:
    """Return all profiles in display order."""
    return [CNOPS, CNSS, AXA, RMA, PAYANT]

