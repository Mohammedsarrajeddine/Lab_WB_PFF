import asyncio
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.models.auth import OperatorRole, OperatorUser
from app.db.models.catalog import AnalysisCatalogItem, Channel, Insurance, PricingRule, PricingTier
from app.db.models.intake import (
    AnalysisRequest,
    AnalysisRequestStatus,
    Conversation,
    ConversationStatus,
    Message,
    MessageDirection,
    MessageType,
    Patient,
    Prescription,
    PrescriptionExtractionStatus,
)
from app.db.session import AsyncSessionLocal
from app.services.catalog.pricing_service import PricingService

CATALOG_BASELINE: list[dict[str, Any]] = [
    {
        "code": "B100",
        "name": "NFS (Numération Formule Sanguine)",
        "coefficient": 50,
        "synonyms": ["nfs", "numération", "numération formule sanguine"],
    },
    {
        "code": "B110",
        "name": "Glycémie à jeun",
        "coefficient": 22,
        "synonyms": ["glycémie", "glycemie", "glycémie à jeun"],
    },
    {
        "code": "B120",
        "name": "Ferritine",
        "coefficient": 38,
        "synonyms": ["ferritine", "fer sérique", "fer serique"],
    },
    {
        "code": "B130",
        "name": "Bilan lipidique",
        "coefficient": 70,
        "synonyms": ["bilan lipidique", "cholestérol", "cholesterol"],
    },
    {
        "code": "B140",
        "name": "TSH (Thyroïde)",
        "coefficient": 64,
        "synonyms": ["tsh", "thyroïde", "thyroide"],
    },
    {
        "code": "B150",
        "name": "CRP (Protéine C-réactive)",
        "coefficient": 30,
        "synonyms": ["crp", "protéine c-réactive", "proteine c-reactive"],
    },
    {
        "code": "B160",
        "name": "VS (Vitesse de sédimentation)",
        "coefficient": 18,
        "synonyms": ["vs", "vitesse de sédimentation", "vitesse de sedimentation"],
    },
]

SEED_INSURANCES: list[dict[str, str]] = [
    {"name": "Caisse Nationale de Sécurité Sociale", "code": "CNSS"},
    {"name": "Caisse Nationale des Organismes de Prévoyance Sociale", "code": "CNOPS"},
    {"name": "Régime d'Assistance Médicale", "code": "RAMED"},
    {"name": "Assurance Maladie Obligatoire", "code": "AMO"},
    {"name": "Mutuelle Générale", "code": "MG"},
]

SEED_CHANNELS: list[str] = [
    "WhatsApp",
    "Téléphone",
    "Sur Place",
    "Email",
    "Site Web",
]

SEED_OPERATORS: list[dict[str, Any]] = [
    {
        "email": "seed.admin@lab.local",
        "password": "SeedAdmin123!",
        "full_name": "Driss Alaoui",
        "role": OperatorRole.ADMIN,
    },
    {
        "email": "seed.manager@lab.local",
        "password": "SeedManager123!",
        "full_name": "Samira El Idrissi",
        "role": OperatorRole.INTAKE_MANAGER,
    },
    {
        "email": "seed.operator@lab.local",
        "password": "SeedOperator123!",
        "full_name": "Yassine Benmoussa",
        "role": OperatorRole.INTAKE_OPERATOR,
    },
]


def _at(base: datetime, *, days_ago: int, hour: int, minute: int) -> datetime:
    return (base - timedelta(days=days_ago)).replace(
        hour=hour,
        minute=minute,
        second=0,
        microsecond=0,
    )


def build_seed_conversations(now: datetime) -> list[dict[str, Any]]:
    return [
        {
            "chat_id": "whatsapp:+212600110001",
            "patient_name": "Youssef El Idrissi",
            "phone": "+212600110001",
            "conversation_status": ConversationStatus.PENDING_REVIEW,
            "analysis_status": AnalysisRequestStatus.IN_REVIEW,
            "pricing_tier": PricingTier.NON_CONVENTIONNEL,
            "notes": "Ordonnance reçue et validée côté accueil. En attente validation biologiste.",
            "messages": [
                {
                    "whatsapp_message_id": "seed-wamid-c1-m1",
                    "direction": MessageDirection.INCOMING,
                    "message_type": MessageType.TEXT,
                    "content_text": "Bonjour, mon médecin m'a demandé une NFS et glycémie.",
                    "sent_at": _at(now, days_ago=3, hour=9, minute=12),
                },
                {
                    "whatsapp_message_id": "seed-wamid-c1-m2",
                    "direction": MessageDirection.INCOMING,
                    "message_type": MessageType.DOCUMENT,
                    "content_text": "Voici mon ordonnance: NFS, glycémie à jeun, ferritine.",
                    "media_url": "https://example.com/ordonnances/youssef-2026-03-27.pdf",
                    "mime_type": "application/pdf",
                    "sent_at": _at(now, days_ago=3, hour=9, minute=18),
                },
                {
                    "whatsapp_message_id": "seed-wamid-c1-m3",
                    "direction": MessageDirection.OUTGOING,
                    "message_type": MessageType.TEXT,
                    "content_text": "Ordonnance reçue. Votre dossier est en cours de revue.",
                    "sent_at": _at(now, days_ago=3, hour=9, minute=35),
                },
            ],
            "prescriptions": [
                {
                    "message_whatsapp_id": "seed-wamid-c1-m2",
                    "file_url": "https://example.com/ordonnances/youssef-2026-03-27.pdf",
                    "mime_type": "application/pdf",
                    "doctor_name": "Dr. Anissa Benali",
                    "date": "2026-03-27",
                    "detected_analyses": [
                        "NFS (Numération Formule Sanguine)",
                        "Glycémie à jeun",
                        "Ferritine",
                    ],
                    "confidence": 0.93,
                }
            ],
        },
        {
            "chat_id": "whatsapp:+212600110002",
            "patient_name": "Salma Ait Lahcen",
            "phone": "+212600110002",
            "conversation_status": ConversationStatus.PREPARED,
            "analysis_status": AnalysisRequestStatus.PREPARED,
            "pricing_tier": PricingTier.CONVENTIONNEL,
            "notes": "Dossier prêt, analyses planifiées pour demain matin à 08:30.",
            "messages": [
                {
                    "whatsapp_message_id": "seed-wamid-c2-m1",
                    "direction": MessageDirection.INCOMING,
                    "message_type": MessageType.IMAGE,
                    "content_text": "Photo ordonnance : bilan lipidique et TSH.",
                    "media_url": "https://example.com/ordonnances/salma-2026-03-28.jpg",
                    "mime_type": "image/jpeg",
                    "sent_at": _at(now, days_ago=2, hour=11, minute=8),
                },
                {
                    "whatsapp_message_id": "seed-wamid-c2-m2",
                    "direction": MessageDirection.OUTGOING,
                    "message_type": MessageType.TEXT,
                    "content_text": "Merci, nous avons bien reçu votre ordonnance.",
                    "sent_at": _at(now, days_ago=2, hour=11, minute=19),
                },
                {
                    "whatsapp_message_id": "seed-wamid-c2-m3",
                    "direction": MessageDirection.OUTGOING,
                    "message_type": MessageType.TEXT,
                    "content_text": "Votre dossier est prêt. Présentez-vous demain à jeun.",
                    "sent_at": _at(now, days_ago=2, hour=12, minute=2),
                },
            ],
            "prescriptions": [
                {
                    "message_whatsapp_id": "seed-wamid-c2-m1",
                    "file_url": "https://example.com/ordonnances/salma-2026-03-28.jpg",
                    "mime_type": "image/jpeg",
                    "doctor_name": "Dr. Mehdi Chraibi",
                    "date": "2026-03-28",
                    "detected_analyses": ["Bilan lipidique", "TSH (Thyroïde)"],
                    "confidence": 0.88,
                }
            ],
        },
        {
            "chat_id": "whatsapp:+212600110003",
            "patient_name": "Mohamed Benslimane",
            "phone": "+212600110003",
            "conversation_status": ConversationStatus.CLOSED,
            "analysis_status": AnalysisRequestStatus.PREPARED,
            "pricing_tier": PricingTier.NON_CONVENTIONNEL,
            "notes": "Résultats transmis et conversation clôturée.",
            "messages": [
                {
                    "whatsapp_message_id": "seed-wamid-c3-m1",
                    "direction": MessageDirection.INCOMING,
                    "message_type": MessageType.DOCUMENT,
                    "content_text": "Ordonnance pour CRP et VS en urgence.",
                    "media_url": "https://example.com/ordonnances/mohamed-2026-03-29.pdf",
                    "mime_type": "application/pdf",
                    "sent_at": _at(now, days_ago=1, hour=8, minute=46),
                },
                {
                    "whatsapp_message_id": "seed-wamid-c3-m2",
                    "direction": MessageDirection.OUTGOING,
                    "message_type": MessageType.TEXT,
                    "content_text": "Bien reçu. Nous lançons la préparation de votre dossier.",
                    "sent_at": _at(now, days_ago=1, hour=8, minute=59),
                },
                {
                    "whatsapp_message_id": "seed-wamid-c3-m3",
                    "direction": MessageDirection.OUTGOING,
                    "message_type": MessageType.TEXT,
                    "content_text": "Vos résultats sont prêts. Merci de votre confiance.",
                    "sent_at": _at(now, days_ago=1, hour=15, minute=24),
                },
            ],
            "prescriptions": [
                {
                    "message_whatsapp_id": "seed-wamid-c3-m1",
                    "file_url": "https://example.com/ordonnances/mohamed-2026-03-29.pdf",
                    "mime_type": "application/pdf",
                    "doctor_name": "Dr. Oumaima El Fassi",
                    "date": "2026-03-29",
                    "detected_analyses": [
                        "CRP (Protéine C-réactive)",
                        "VS (Vitesse de sédimentation)",
                    ],
                    "confidence": 0.9,
                }
            ],
        },
        {
            "chat_id": "whatsapp:+212600110004",
            "patient_name": "Imane Kabbaj",
            "phone": "+212600110004",
            "conversation_status": ConversationStatus.OPEN,
            "analysis_status": AnalysisRequestStatus.RECEIVED,
            "pricing_tier": PricingTier.NON_CONVENTIONNEL,
            "notes": "Patiente demande uniquement les horaires de passage.",
            "messages": [
                {
                    "whatsapp_message_id": "seed-wamid-c4-m1",
                    "direction": MessageDirection.INCOMING,
                    "message_type": MessageType.TEXT,
                    "content_text": "Bonsoir, je peux passer demain matin pour une prise de sang ?",
                    "sent_at": _at(now, days_ago=0, hour=19, minute=7),
                },
                {
                    "whatsapp_message_id": "seed-wamid-c4-m2",
                    "direction": MessageDirection.OUTGOING,
                    "message_type": MessageType.TEXT,
                    "content_text": "Oui, le laboratoire ouvre à 8h. Venez à jeun si besoin.",
                    "sent_at": _at(now, days_ago=0, hour=19, minute=12),
                },
            ],
            "prescriptions": [],
        },
    ]


async def seed_catalog_baseline(session, stats: dict[str, int]) -> None:
    pricing_rules = {
        PricingTier.CONVENTIONNEL: 1.10,
        PricingTier.NON_CONVENTIONNEL: 1.34,
    }
    for tier, multiplier in pricing_rules.items():
        rule = await session.scalar(select(PricingRule).where(PricingRule.tier == tier))
        if rule is None:
            session.add(PricingRule(tier=tier, multiplier=multiplier))
            stats["pricing_rules_created"] += 1
        else:
            rule.multiplier = multiplier
            stats["pricing_rules_updated"] += 1

    for item in CATALOG_BASELINE:
        existing = await session.scalar(
            select(AnalysisCatalogItem).where(AnalysisCatalogItem.code == item["code"])
        )
        normalized_synonyms = [str(s).strip().lower() for s in item["synonyms"]]
        if existing is None:
            session.add(
                AnalysisCatalogItem(
                    code=item["code"],
                    name=item["name"],
                    coefficient=int(item["coefficient"]),
                    synonyms=normalized_synonyms,
                )
            )
            stats["catalog_items_created"] += 1
            continue

        existing.name = item["name"]
        existing.coefficient = int(item["coefficient"])
        merged_synonyms = list(dict.fromkeys([*(existing.synonyms or []), *normalized_synonyms]))
        existing.synonyms = merged_synonyms
        stats["catalog_items_updated"] += 1

    await session.flush()


async def seed_reference_data(session, stats: dict[str, int]) -> None:
    for ins_data in SEED_INSURANCES:
        existing = await session.scalar(
            select(Insurance).where(Insurance.code == ins_data["code"])
        )
        if existing is None:
            session.add(Insurance(name=ins_data["name"], code=ins_data["code"]))
            stats.setdefault("insurances_created", 0)
            stats["insurances_created"] += 1

    for ch_name in SEED_CHANNELS:
        existing = await session.scalar(
            select(Channel).where(Channel.name == ch_name)
        )
        if existing is None:
            session.add(Channel(name=ch_name))
            stats.setdefault("channels_created", 0)
            stats["channels_created"] += 1

    await session.flush()


async def seed_operators(session, stats: dict[str, int]) -> None:
    for raw_operator in SEED_OPERATORS:
        email = str(raw_operator["email"]).strip().lower()
        operator = await session.scalar(
            select(OperatorUser).where(OperatorUser.email == email)
        )
        if operator is None:
            operator = OperatorUser(
                email=email,
                full_name=str(raw_operator["full_name"]),
                password_hash=hash_password(str(raw_operator["password"])),
                role=raw_operator["role"],
                is_active=True,
            )
            session.add(operator)
            stats["operators_created"] += 1
        else:
            operator.full_name = str(raw_operator["full_name"])
            operator.password_hash = hash_password(str(raw_operator["password"]))
            operator.role = raw_operator["role"]
            operator.is_active = True
            stats["operators_updated"] += 1

    await session.flush()


async def upsert_patient(
    session,
    *,
    phone: str,
    patient_name: str,
    stats: dict[str, int],
) -> Patient:
    patient = await session.scalar(select(Patient).where(Patient.phone_e164 == phone))
    if patient is None:
        patient = Patient(phone_e164=phone, full_name=patient_name)
        session.add(patient)
        stats["patients_created"] += 1
        await session.flush()
        return patient

    if patient_name and patient.full_name != patient_name:
        patient.full_name = patient_name
    stats["patients_updated"] += 1
    return patient


async def upsert_conversation(
    session,
    *,
    chat_id: str,
    patient: Patient,
    conversation_status: ConversationStatus,
    stats: dict[str, int],
) -> Conversation:
    conversation = await session.scalar(
        select(Conversation).where(Conversation.whatsapp_chat_id == chat_id)
    )
    if conversation is None:
        conversation = Conversation(
            whatsapp_chat_id=chat_id,
            patient=patient,
            status=conversation_status,
        )
        session.add(conversation)
        stats["conversations_created"] += 1
        await session.flush()
        return conversation

    conversation.patient = patient
    conversation.status = conversation_status
    stats["conversations_updated"] += 1
    return conversation


async def upsert_analysis_request(
    session,
    *,
    conversation: Conversation,
    patient: Patient,
    analysis_status: AnalysisRequestStatus,
    pricing_tier: PricingTier,
    notes: str,
    stats: dict[str, int],
) -> AnalysisRequest:
    analysis_request = await session.scalar(
        select(AnalysisRequest).where(AnalysisRequest.conversation_id == conversation.id)
    )
    if analysis_request is None:
        analysis_request = AnalysisRequest(
            conversation_id=conversation.id,
            patient_id=patient.id,
            status=analysis_status,
            pricing_tier=pricing_tier,
            notes=notes,
        )
        session.add(analysis_request)
        stats["analysis_requests_created"] += 1
        await session.flush()
        return analysis_request

    analysis_request.patient_id = patient.id
    analysis_request.status = analysis_status
    analysis_request.pricing_tier = pricing_tier
    analysis_request.notes = notes
    stats["analysis_requests_updated"] += 1
    return analysis_request


async def upsert_message(
    session,
    *,
    conversation: Conversation,
    message_data: dict[str, Any],
    stats: dict[str, int],
) -> Message:
    whatsapp_message_id = str(message_data["whatsapp_message_id"])
    message = await session.scalar(
        select(Message).where(Message.whatsapp_message_id == whatsapp_message_id)
    )
    if message is None:
        message = Message(
            conversation_id=conversation.id,
            direction=message_data["direction"],
            message_type=message_data["message_type"],
            whatsapp_message_id=whatsapp_message_id,
            content_text=message_data.get("content_text"),
            media_url=message_data.get("media_url"),
            mime_type=message_data.get("mime_type"),
            sent_at=message_data["sent_at"],
        )
        session.add(message)
        stats["messages_created"] += 1
    else:
        message.conversation_id = conversation.id
        message.direction = message_data["direction"]
        message.message_type = message_data["message_type"]
        message.content_text = message_data.get("content_text")
        message.media_url = message_data.get("media_url")
        message.mime_type = message_data.get("mime_type")
        message.sent_at = message_data["sent_at"]
        stats["messages_updated"] += 1

    await session.flush()
    return message


async def upsert_prescription(
    session,
    *,
    pricing_service: PricingService,
    conversation: Conversation,
    patient: Patient,
    analysis_request: AnalysisRequest,
    message: Message,
    prescription_data: dict[str, Any],
    stats: dict[str, int],
) -> None:
    detected_analyses = list(prescription_data["detected_analyses"])
    pricing_data = await pricing_service.estimate_price(
        detected_analyses,
        analysis_request.pricing_tier,
    )
    extracted_payload = {
        "source": "seed_script",
        "doctor_name": prescription_data.get("doctor_name"),
        "patient_name": patient.full_name,
        "date": prescription_data.get("date"),
        "detected_analyses": detected_analyses,
        "notes": "Imported as realistic development fixture.",
        "confidence": float(prescription_data.get("confidence", 0.85)),
        "pricing_data": pricing_data,
    }

    prescription = await session.scalar(
        select(Prescription).where(Prescription.message_id == message.id)
    )
    if prescription is None:
        prescription = Prescription(
            conversation_id=conversation.id,
            message_id=message.id,
            file_url=prescription_data.get("file_url"),
            mime_type=prescription_data.get("mime_type"),
            extraction_status=PrescriptionExtractionStatus.COMPLETED,
            extracted_payload=extracted_payload,
        )
        session.add(prescription)
        stats["prescriptions_created"] += 1
    else:
        prescription.conversation_id = conversation.id
        prescription.file_url = prescription_data.get("file_url")
        prescription.mime_type = prescription_data.get("mime_type")
        prescription.extraction_status = PrescriptionExtractionStatus.COMPLETED
        prescription.extracted_payload = extracted_payload
        stats["prescriptions_updated"] += 1

    await session.flush()


async def seed_real_world_data() -> None:
    async with AsyncSessionLocal() as session:
        # Prevent completely overwriting an already populated DB loop
        existing_conversations = await session.scalar(select(func.count(Conversation.id)))
        if existing_conversations > 0:
            print("✅ Database already populated. Skipping real-world seed script to prevent overwriting user data.")
            return

    stats: dict[str, int] = {
        "pricing_rules_created": 0,
        "pricing_rules_updated": 0,
        "catalog_items_created": 0,
        "catalog_items_updated": 0,
        "operators_created": 0,
        "operators_updated": 0,
        "patients_created": 0,
        "patients_updated": 0,
        "conversations_created": 0,
        "conversations_updated": 0,
        "analysis_requests_created": 0,
        "analysis_requests_updated": 0,
        "messages_created": 0,
        "messages_updated": 0,
        "prescriptions_created": 0,
        "prescriptions_updated": 0,
    }

    fixtures = build_seed_conversations(datetime.now(UTC))

    async with AsyncSessionLocal() as session:
        await seed_catalog_baseline(session, stats)
        await seed_reference_data(session, stats)
        await seed_operators(session, stats)

        pricing_service = PricingService(session)

        for fixture in fixtures:
            patient = await upsert_patient(
                session,
                phone=fixture["phone"],
                patient_name=fixture["patient_name"],
                stats=stats,
            )
            conversation = await upsert_conversation(
                session,
                chat_id=fixture["chat_id"],
                patient=patient,
                conversation_status=fixture["conversation_status"],
                stats=stats,
            )
            analysis_request = await upsert_analysis_request(
                session,
                conversation=conversation,
                patient=patient,
                analysis_status=fixture["analysis_status"],
                pricing_tier=fixture["pricing_tier"],
                notes=fixture["notes"],
                stats=stats,
            )

            message_map: dict[str, Message] = {}
            for message_data in fixture["messages"]:
                message = await upsert_message(
                    session,
                    conversation=conversation,
                    message_data=message_data,
                    stats=stats,
                )
                message_map[str(message_data["whatsapp_message_id"])] = message

            if message_map:
                conversation.last_message_at = max(
                    message.sent_at for message in message_map.values()
                )

            for prescription_data in fixture["prescriptions"]:
                message = message_map.get(str(prescription_data["message_whatsapp_id"]))
                if message is None:
                    continue
                await upsert_prescription(
                    session,
                    pricing_service=pricing_service,
                    conversation=conversation,
                    patient=patient,
                    analysis_request=analysis_request,
                    message=message,
                    prescription_data=prescription_data,
                    stats=stats,
                )

        await session.commit()

    print("✅ Real-world seed completed.")
    print("\nSeed summary:")
    for key, value in stats.items():
        print(f"- {key}: {value}")

    print("\nSeeded operator accounts:")
    for operator in SEED_OPERATORS:
        print(
            f"- {operator['email']} | password: {operator['password']} | role: {operator['role'].value}"
        )


if __name__ == "__main__":
    asyncio.run(seed_real_world_data())
