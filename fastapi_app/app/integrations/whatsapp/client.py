"""WhatsApp Business API client — singleton with connection pooling."""

import logging

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


class WhatsAppClient:
    """Singleton WhatsApp client that reuses an httpx connection pool.

    Usage::

        client = WhatsAppClient.get_instance()
        await client.send_text_message("+212600000000", "Hello")
    """

    _instance: "WhatsAppClient | None" = None
    _http_client: httpx.AsyncClient | None = None

    def __init__(self) -> None:
        self.phone_id = settings.whatsapp_phone_number_id
        self.token = settings.whatsapp_access_token
        self.base_url = f"https://graph.facebook.com/v22.0/{self.phone_id}"

    @classmethod
    def get_instance(cls) -> "WhatsAppClient":
        """Return the singleton instance, creating it on first call."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def _get_http_client(cls) -> httpx.AsyncClient:
        """Lazily create and cache the httpx AsyncClient with connection pooling."""
        if cls._http_client is None or cls._http_client.is_closed:
            cls._http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=10.0),
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            )
        return cls._http_client

    @classmethod
    async def close(cls) -> None:
        """Shutdown the shared HTTP client (call on app shutdown)."""
        if cls._http_client and not cls._http_client.is_closed:
            await cls._http_client.aclose()
            cls._http_client = None
        cls._instance = None

    async def send_text_message(self, to_phone: str, text: str) -> dict:
        """Send a text message via WhatsApp Business API.

        Falls back to simulation mode if credentials are missing or
        WHATSAPP_SIMULATION_MODE is enabled.
        """
        if settings.whatsapp_simulation_mode or not self.token or not self.phone_id:
            logger.info("[SIMULATION] Sending WhatsApp to %s: %s", to_phone, text[:120])
            return {"simulated": True, "to": to_phone, "text": text}

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

        # WhatsApp expects international format without '+'
        normalized_to = to_phone.strip().lstrip("+")

        payload = {
            "messaging_product": "whatsapp",
            "to": normalized_to,
            "type": "text",
            "text": {"body": text},
        }

        client = self._get_http_client()
        try:
            response = await client.post(
                f"{self.base_url}/messages",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            logger.error("WhatsApp API error: %s", exc.response.text)
            raise
