"""Proxy endpoint to fetch WhatsApp media via Graph API with auth."""

import httpx
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response

from app.core.config import settings

router = APIRouter(tags=["media"])


@router.get("/media/whatsapp/{media_id}")
async def proxy_whatsapp_media(media_id: str) -> Response:
    """Fetch a WhatsApp media file via the Graph API and stream it back.

    The Graph API requires two steps:
    1. GET /v22.0/{media_id} → returns JSON with a ``url`` field
    2. GET that ``url`` with Bearer token → returns the binary content
    """
    token = settings.whatsapp_access_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WhatsApp access token not configured",
        )

    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: resolve media ID → download URL
        meta_resp = await client.get(
            f"https://graph.facebook.com/v22.0/{media_id}",
            headers=headers,
        )
        if meta_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to resolve media URL from Graph API",
            )

        download_url = meta_resp.json().get("url")
        if not download_url:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Graph API did not return a download URL",
            )

        # Step 2: download the actual binary
        media_resp = await client.get(download_url, headers=headers)
        if media_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to download media from WhatsApp",
            )

        content_type = media_resp.headers.get("content-type", "application/octet-stream")

        return Response(
            content=media_resp.content,
            media_type=content_type,
            headers={"Cache-Control": "private, max-age=3600"},
        )
