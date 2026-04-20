"""Repository layer — data access abstraction for domain models.

Each repository encapsulates SQLAlchemy queries for a specific model,
keeping service code focused on business logic.
"""

from app.db.repositories.patient_repo import PatientRepository
from app.db.repositories.conversation_repo import ConversationRepository
from app.db.repositories.message_repo import MessageRepository
from app.db.repositories.prescription_repo import PrescriptionRepository
from app.db.repositories.result_repo import ResultRepository

__all__ = [
    "PatientRepository",
    "ConversationRepository",
    "MessageRepository",
    "PrescriptionRepository",
    "ResultRepository",
]
