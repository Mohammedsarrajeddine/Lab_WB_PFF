"""Patient data access."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.intake import Patient


class PatientRepository:
    """Encapsulates all database operations for the Patient model."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_phone(self, phone_e164: str) -> Patient | None:
        return await self._session.scalar(
            select(Patient).where(Patient.phone_e164 == phone_e164)
        )

    async def get_or_create(
        self,
        *,
        phone_e164: str,
        full_name: str | None,
    ) -> Patient:
        patient = await self.find_by_phone(phone_e164)
        if patient:
            if full_name and patient.full_name != full_name:
                patient.full_name = full_name
            return patient

        patient = Patient(phone_e164=phone_e164, full_name=full_name)
        self._session.add(patient)
        await self._session.flush()
        return patient
