"""Prescription detection and extraction.

Downloads the image from WhatsApp Graph API, sends it to Groq Vision
for real OCR extraction, falls back to keyword-based stub.
"""

from __future__ import annotations

import base64
import logging
import re
from typing import Any

import httpx

from app.db.models.intake import MessageType

logger = logging.getLogger(__name__)

_PRESCRIPTION_KEYWORDS = (
    "ordonnance",
    "prescription",
    "analyse",
    "analyses",
    "bilan",
)

_EXTRACTION_SYSTEM_PROMPT = """\
Tu es un assistant spécialisé dans l'extraction d'informations \
à partir d'ordonnances médicales marocaines.

À partir du texte ou de l'image fournis, extrais les informations suivantes \
au format JSON strict :
{
  "doctor_name": "nom du médecin prescripteur ou null",
  "patient_name": "nom du patient ou null",
  "date": "date de l'ordonnance (format YYYY-MM-DD) ou null",
  "detected_analyses": ["liste des analyses demandées"],
  "notes": "remarques supplémentaires ou null"
}

Règles :
- Retourne UNIQUEMENT le JSON, aucun texte avant ou après.
- Si une information n'est pas trouvée, mettre null.
- Les noms d'analyses doivent être en français, en utilisant le NOM COMPLET \
STANDARD de la nomenclature marocaine (pas les abréviations seules).
- Voici les correspondances à respecter :
  • NFS → "Numération Formule Sanguine"
  • GAJ → "Glycémie à jeun"
  • HbA1c → "Hémoglobine glycosylée"
  • TG → "Triglycérides"
  • LDL → "Cholestérol LDL"
  • HDL → "Cholestérol HDL"
  • Na+ → "Sodium"
  • K+ → "Potassium"
  • VS → "Vitesse de sédimentation"
  • TGO / ASAT → "Transaminases TGO"
  • TGP / ALAT → "Transaminases TGP"
  • GGT → "Gamma glutamyl transférase"
  • TSH → "TSH"
  • CRP → "CRP"
  • ECBU → "ECBU"
- Si l'ordonnance mentionne "urée, créa, Na+, K+", liste chaque analyse \
séparément : ["Urée", "Créatinine", "Sodium", "Potassium"].
- Sois précis et exhaustif.
"""


def is_prescription_candidate(
    *,
    message_type: MessageType,
    mime_type: str | None,
    media_url: str | None,
    content_text: str | None,
) -> bool:
    """Detect whether a message likely contains a prescription."""
    if message_type in {MessageType.IMAGE, MessageType.DOCUMENT}:
        if mime_type:
            lowered_mime = mime_type.lower()
            if "pdf" in lowered_mime or lowered_mime.startswith("image/"):
                return True
        if media_url:
            lowered_url = media_url.lower()
            if lowered_url.endswith((".pdf", ".jpg", ".jpeg", ".png", ".webp")):
                return True

    lowered_text = (content_text or "").lower()
    return any(keyword in lowered_text for keyword in _PRESCRIPTION_KEYWORDS)


async def extract_prescription_payload(
    *,
    media_url: str | None,
    mime_type: str | None,
    content_text: str | None,
) -> dict[str, Any]:
    """Extract structured prescription data.

    Strategy (priority order):
    1. **Gemini 3 Flash Preview** — best accuracy for handwriting (via OpenRouter)
    2. **Groq Vision LLM** — fast cloud fallback
    3. **Local OCR** (EasyOCR + OpenCV + regex) — free, offline, no API keys
    4. **Keyword stub** — last-resort fallback
    """
    image_bytes: bytes | None = None
    local_result: dict[str, Any] | None = None

    # --- Step 0: Download image if available ---
    if media_url:
        try:
            image_bytes, _ = await _download_whatsapp_media(media_url)
            logger.info("Downloaded %d bytes for OCR", len(image_bytes))
        except Exception:
            logger.exception("Failed to download media for OCR")

    # --- 1. Gemini via OpenRouter (best for handwriting) ---
    if image_bytes:
        from app.core.config import settings
        if settings.gemini_api_key:
            try:
                logger.info("Trying Gemini (%s) for OCR...", settings.gemini_model)
                gemini_result = await _extract_with_gemini(
                    image_bytes=image_bytes,
                    mime_type=mime_type or "image/jpeg",
                    content_text=content_text,
                    media_url=media_url,
                )
                gemini_analyses = gemini_result.get("detected_analyses") or []
                if gemini_analyses:
                    logger.info("Gemini found %d analyses: %s", len(gemini_analyses), gemini_analyses)
                    return gemini_result
                logger.info("Gemini returned no analyses")
            except Exception:
                logger.exception("Gemini vision OCR failed")

    # --- 2. Groq Vision fallback ---
    if image_bytes or (content_text and content_text.strip()):
        from app.core.config import settings
        if settings.groq_api_key:
            try:
                logger.info("Trying Groq fallback for OCR...")
                groq_result = await _extract_with_groq(
                    media_url=media_url,
                    mime_type=mime_type,
                    content_text=content_text,
                    image_bytes=image_bytes,
                )
                groq_analyses = groq_result.get("detected_analyses") or []
                if groq_analyses:
                    logger.info("Groq found %d analyses: %s", len(groq_analyses), groq_analyses)
                    return groq_result
            except Exception:
                logger.exception("Groq fallback failed")

    # --- 3. Local OCR fallback (EasyOCR + OpenCV) ---
    if image_bytes:
        try:
            from app.services.ocr import extract_text_from_image, extract_prescription_fields
            ocr_text = extract_text_from_image(image_bytes)
            local_result = extract_prescription_fields(ocr_text)
            local_result["media_url"] = media_url
            local_result["mime_type"] = mime_type

            local_analyses = local_result.get("detected_analyses") or []
            logger.info("Local OCR found %d analyses: %s", len(local_analyses), local_analyses)
            if local_analyses:
                return local_result
        except Exception:
            logger.exception("Local OCR extraction failed")

    # --- 4. Return partial local result if available ---
    if local_result is not None and (local_result.get("detected_analyses") or local_result.get("ocr_text")):
        return local_result

    # --- 5. Keyword stub last resort ---
    return _extract_stub(
        media_url=media_url,
        mime_type=mime_type,
        content_text=content_text,
    )


async def _download_whatsapp_media(media_url: str) -> tuple[bytes, str]:
    """Download media from WhatsApp Graph API (requires two-step auth).

    Step 1: GET /v22.0/{media_id} → JSON with ``url`` field
    Step 2: GET that URL with Bearer token → binary content

    Returns (image_bytes, content_type).
    """
    from app.core.config import settings

    token = settings.whatsapp_access_token
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Extract media ID from the Graph API URL
        media_id_match = re.search(r"/(\d+)$", media_url)
        if not media_id_match:
            raise ValueError(f"Cannot extract media ID from URL: {media_url}")

        media_id = media_id_match.group(1)
        meta_resp = await client.get(
            f"https://graph.facebook.com/v22.0/{media_id}",
            headers=headers,
        )
        meta_resp.raise_for_status()
        download_url = meta_resp.json().get("url")
        if not download_url:
            raise ValueError("Graph API did not return a download URL")

        # Download the actual binary
        media_resp = await client.get(download_url, headers=headers)
        media_resp.raise_for_status()

        content_type = media_resp.headers.get("content-type", "image/jpeg")
        return media_resp.content, content_type


async def _extract_with_gemini(
    *,
    image_bytes: bytes,
    mime_type: str,
    content_text: str | None,
    media_url: str | None,
) -> dict[str, Any]:
    """Use Gemini via OpenRouter to OCR the prescription image.

    Best accuracy for handwritten text. Model configured in settings.gemini_model.
    """
    import json

    from app.integrations.gemini import generate_gemini_vision

    user_prompt = (
        "Analyse cette ordonnance médicale et extrais toutes les informations "
        "au format JSON demandé. Lis attentivement le texte manuscrit et imprimé."
    )
    if content_text and content_text.strip():
        user_prompt += f"\n\nTexte accompagnant : {content_text.strip()}"

    raw_response = await generate_gemini_vision(
        image_bytes=image_bytes,
        mime_type=mime_type,
        system_prompt=_EXTRACTION_SYSTEM_PROMPT,
        user_text=user_prompt,
        temperature=0.1,
        max_tokens=1024,
    )

    logger.debug("Gemini response: %s", raw_response[:300])

    # --- Parse JSON from response ---
    cleaned = raw_response.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [ln for ln in lines if not ln.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()

    try:
        extracted = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Could not parse Gemini response as JSON: %s", cleaned[:200])
        extracted = {}

    return {
        "source": "gemini_vision",
        "media_url": media_url,
        "mime_type": mime_type,
        "doctor_name": extracted.get("doctor_name"),
        "patient_name": extracted.get("patient_name"),
        "date": extracted.get("date"),
        "detected_analyses": extracted.get("detected_analyses", []),
        "notes": extracted.get("notes"),
        "confidence": 0.95 if extracted.get("detected_analyses") else 0.4,
        "raw_extraction": extracted,
    }


async def _extract_with_groq(
    *,
    media_url: str | None,
    mime_type: str | None,
    content_text: str | None,
    image_bytes: bytes | None = None,
) -> dict[str, Any]:
    """Use Groq Vision to OCR the prescription image and extract structured data.

    If ``image_bytes`` are provided (pre-downloaded), skip the download step.
    """
    import json

    from app.integrations.groq import generate_chat_completion, generate_vision_completion

    actual_mime: str = mime_type or "image/jpeg"

    # Download image if not already provided
    if image_bytes is None and media_url:
        try:
            image_bytes, actual_mime = await _download_whatsapp_media(media_url)
            logger.info("Downloaded %d bytes, type=%s", len(image_bytes), actual_mime)
        except Exception:
            logger.exception("Failed to download media from WhatsApp for OCR")

    # --- Vision path: image available ---
    if image_bytes and actual_mime.startswith("image/"):
        image_b64 = base64.b64encode(image_bytes).decode("ascii")

        user_prompt = (
            "Analyse cette ordonnance médicale et extrais toutes les informations "
            "au format JSON demandé. Lis attentivement le texte manuscrit et imprimé."
        )
        if content_text and content_text.strip():
            user_prompt += f"\n\nTexte accompagnant : {content_text.strip()}"

        raw_response = await generate_vision_completion(
            image_base64=image_b64,
            mime_type=actual_mime,
            system_prompt=_EXTRACTION_SYSTEM_PROMPT,
            user_text=user_prompt,
            temperature=0.1,
            max_tokens=1024,
        )
        source = "groq_vision"
        logger.debug("Vision response: %s", raw_response[:200])

    # --- Text-only path: no image, use text LLM ---
    elif content_text and content_text.strip():
        raw_response = await generate_chat_completion(
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Voici le texte d'une ordonnance médicale :\n\n"
                        f"{content_text.strip()}\n\n"
                        "Extrais les informations au format JSON demandé."
                    ),
                }
            ],
            system_prompt=_EXTRACTION_SYSTEM_PROMPT,
            temperature=0.1,
            max_tokens=512,
        )
        source = "groq_text"
    else:
        return _extract_stub(
            media_url=media_url, mime_type=mime_type, content_text=content_text,
        )

    # --- Parse JSON from response ---
    cleaned = raw_response.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [ln for ln in lines if not ln.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()

    try:
        extracted = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Could not parse Groq extraction response as JSON: %s", cleaned[:200])
        extracted = {}

    return {
        "source": source,
        "media_url": media_url,
        "mime_type": mime_type,
        "doctor_name": extracted.get("doctor_name"),
        "patient_name": extracted.get("patient_name"),
        "date": extracted.get("date"),
        "detected_analyses": extracted.get("detected_analyses", []),
        "notes": extracted.get("notes"),
        "confidence": 0.90 if extracted.get("detected_analyses") else 0.4,
        "raw_extraction": extracted,
    }


def _extract_stub(
    *,
    media_url: str | None,
    mime_type: str | None,
    content_text: str | None,
) -> dict[str, Any]:
    """Keyword-based fallback extraction (no LLM)."""
    text_lower = (content_text or "").lower()

    detected: list[str] = []
    analysis_keywords = {
        "nfs": "NFS (Numération Formule Sanguine)",
        "numération": "NFS (Numération Formule Sanguine)",
        "glycémie": "Glycémie à jeun",
        "glycemie": "Glycémie à jeun",
        "bilan lipidique": "Bilan lipidique",
        "cholestérol": "Bilan lipidique",
        "cholesterol": "Bilan lipidique",
        "bilan rénal": "Bilan rénal",
        "créatinine": "Créatinine",
        "creatinine": "Créatinine",
        "bilan hépatique": "Bilan hépatique",
        "transaminases": "Transaminases",
        "tsh": "TSH (Thyroïde)",
        "thyroïde": "TSH (Thyroïde)",
        "thyroide": "TSH (Thyroïde)",
        "ecbu": "ECBU (Examen urinaire)",
        "hémoglobine": "Hémoglobine glyquée",
        "hemoglobine": "Hémoglobine glyquée",
        "vitamine d": "Vitamine D",
        "fer": "Fer sérique",
        "ferritine": "Ferritine",
        "vs": "VS (Vitesse de sédimentation)",
        "crp": "CRP (Protéine C-réactive)",
    }

    for keyword, analysis_name in analysis_keywords.items():
        if keyword in text_lower and analysis_name not in detected:
            detected.append(analysis_name)

    return {
        "source": "keyword_stub",
        "media_url": media_url,
        "mime_type": mime_type,
        "doctor_name": None,
        "patient_name": None,
        "date": None,
        "detected_analyses": detected,
        "notes": None,
        "confidence": 0.5 if detected else 0.1,
        "text_excerpt": (content_text or "")[:240],
    }


# Keep backward-compatible alias
def extract_prescription_payload_stub(
    *,
    media_url: str | None,
    mime_type: str | None,
    content_text: str | None,
) -> dict[str, Any]:
    """Synchronous backward-compatible alias — uses keyword stub only."""
    return _extract_stub(
        media_url=media_url,
        mime_type=mime_type,
        content_text=content_text,
    )
