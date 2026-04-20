"""Gemini vision client for prescription OCR via OpenRouter.

Uses OpenRouter's OpenAI-compatible API to access Gemini models
(default: google/gemini-3-flash-preview) for high-accuracy handwritten text extraction.
"""

from __future__ import annotations

import base64
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


async def generate_gemini_vision(
    *,
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    system_prompt: str,
    user_text: str,
    temperature: float = 0.1,
    max_tokens: int = 1024,
) -> str:
    """Send an image to Gemini 2.0 Flash via OpenRouter and return text."""
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY (OpenRouter) is not configured")

    image_b64 = base64.b64encode(image_bytes).decode("ascii")
    data_uri = f"data:{mime_type};base64,{image_b64}"

    payload = {
        "model": settings.gemini_model,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": data_uri}},
                    {"type": "text", "text": user_text},
                ],
            },
        ],
    }

    headers = {
        "Authorization": f"Bearer {settings.gemini_api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(OPENROUTER_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    return data["choices"][0]["message"]["content"]
