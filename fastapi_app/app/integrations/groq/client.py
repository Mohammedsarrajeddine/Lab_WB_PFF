from __future__ import annotations

from groq import AsyncGroq

from app.core.config import settings


def _get_client() -> AsyncGroq:
    api_key = settings.groq_api_key.strip()
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. "
            "Set it in your .env file to enable the chatbot."
        )
    return AsyncGroq(api_key=api_key)


async def generate_chat_completion(
    *,
    messages: list[dict[str, str]],
    system_prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 1024,
) -> str:
    """Send a chat completion request to Groq and return the assistant reply."""
    client = _get_client()

    full_messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt},
        *messages,
    ]

    response = await client.chat.completions.create(
        model=settings.groq_model,
        messages=full_messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    choice = response.choices[0]
    return (choice.message.content or "").strip()


async def generate_vision_completion(
    *,
    image_base64: str,
    mime_type: str,
    system_prompt: str,
    user_text: str = "Analyse cette image.",
    temperature: float = 0.1,
    max_tokens: int = 1024,
) -> str:
    """Send a multimodal (vision) request to Groq with an image and return the reply."""
    client = _get_client()

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{image_base64}",
                    },
                },
                {
                    "type": "text",
                    "text": user_text,
                },
            ],
        },
    ]

    response = await client.chat.completions.create(
        model=settings.groq_vision_model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    choice = response.choices[0]
    return (choice.message.content or "").strip()
