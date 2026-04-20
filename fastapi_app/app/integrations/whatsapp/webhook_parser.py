"""Parse Meta's nested WhatsApp webhook payload into flat internal schema."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from app.db.models.intake import MessageDirection, MessageType
from app.schemas.intake import WhatsAppWebhookIn

logger = logging.getLogger(__name__)

# Mapping from Meta message type strings to our internal MessageType enum
_META_TYPE_MAP: dict[str, MessageType] = {
    "text": MessageType.TEXT,
    "image": MessageType.IMAGE,
    "document": MessageType.DOCUMENT,
    "audio": MessageType.AUDIO,
}


def parse_meta_webhook(raw: dict) -> list[WhatsAppWebhookIn]:
    """Extract messages from a Meta webhook payload.

    Meta sends a nested structure::

        {
          "object": "whatsapp_business_account",
          "entry": [{
            "changes": [{
              "value": {
                "contacts": [{"profile": {"name": "..."}, "wa_id": "..."}],
                "messages": [{
                  "from": "212...",
                  "id": "wamid...",
                  "timestamp": "...",
                  "type": "text",
                  "text": {"body": "Hello"}
                }]
              },
              "field": "messages"
            }]
          }]
        }

    Returns a list of :class:`WhatsAppWebhookIn` (one per message).
    Status-only payloads (delivered/read receipts) return an empty list.
    """
    results: list[WhatsAppWebhookIn] = []

    if raw.get("object") != "whatsapp_business_account":
        logger.warning("Ignoring non-WhatsApp webhook object: %s", raw.get("object"))
        return results

    for entry in raw.get("entry", []):
        for change in entry.get("changes", []):
            if change.get("field") != "messages":
                continue

            value = change.get("value", {})
            contacts = value.get("contacts", [])
            messages = value.get("messages", [])

            if not messages:
                # Status update (delivered, read, etc.) — nothing to ingest
                continue

            # Build a lookup for contact names
            contact_names: dict[str, str] = {}
            for contact in contacts:
                wa_id = contact.get("wa_id", "")
                name = contact.get("profile", {}).get("name")
                if wa_id and name:
                    contact_names[wa_id] = name

            for msg in messages:
                try:
                    from_phone = msg.get("from", "")
                    msg_type_str = msg.get("type", "text")
                    meta_type = _META_TYPE_MAP.get(msg_type_str, MessageType.OTHER)

                    # Extract text body and media info
                    text: str | None = None
                    media_url: str | None = None
                    mime_type: str | None = None

                    if meta_type == MessageType.TEXT:
                        text = (msg.get("text") or {}).get("body")
                    elif meta_type in (MessageType.IMAGE, MessageType.DOCUMENT, MessageType.AUDIO):
                        media_obj = msg.get(msg_type_str, {})
                        text = media_obj.get("caption")
                        mime_type = media_obj.get("mime_type")
                        # Build Graph API URL from media ID
                        media_id = media_obj.get("id")
                        if media_id:
                            media_url = f"https://graph.facebook.com/v22.0/{media_id}"

                    # Timestamp
                    sent_at: datetime | None = None
                    ts = msg.get("timestamp")
                    if ts:
                        try:
                            sent_at = datetime.fromtimestamp(int(ts), tz=UTC)
                        except (ValueError, OSError):
                            pass

                    results.append(
                        WhatsAppWebhookIn(
                            chat_id=from_phone,
                            from_phone=from_phone,
                            from_name=contact_names.get(from_phone),
                            message_id=msg.get("id"),
                            direction=MessageDirection.INCOMING,
                            message_type=meta_type,
                            text=text,
                            media_url=media_url,
                            mime_type=mime_type,
                            sent_at=sent_at,
                        )
                    )
                except Exception:
                    logger.exception("Failed to parse individual message from Meta webhook")

    return results
