import uuid
from enum import StrEnum

from sqlalchemy import Boolean, Enum, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class PricingTier(StrEnum):
    CONVENTIONNEL = "conventionnel"
    NON_CONVENTIONNEL = "non_conventionnel"


# ---------------------------------------------------------------------------
# Reference / lookup tables
# ---------------------------------------------------------------------------


class Insurance(TimestampMixin, Base):
    """Mutuelles / assurances accepted by the laboratory."""

    __tablename__ = "assurances"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )


class Channel(TimestampMixin, Base):
    """Contact channels through which patients reach the laboratory."""

    __tablename__ = "channels"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

class PricingRule(TimestampMixin, Base):
    __tablename__ = "pricing_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    tier: Mapped[PricingTier] = mapped_column(
        Enum(
            PricingTier, 
            name="pricing_tier_enum", 
            values_callable=lambda obj: [e.value for e in obj],
            create_type=False
        ),
        nullable=False,
        unique=True,
    )
    multiplier: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

class AnalysisCatalogItem(TimestampMixin, Base):
    __tablename__ = "analysis_catalog"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    code: Mapped[str] = mapped_column(
        String(32),
        unique=True,
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    coefficient: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    synonyms: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default="[]",
    )
