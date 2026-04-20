from fastapi.testclient import TestClient

from app.application import app


def test_conversations_requires_authentication() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/conversations")

    assert response.status_code == 401
    payload = response.json()
    assert payload["detail"] == "Not authenticated"


def test_webhook_route_remains_public() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/whatsapp/webhook",
        json={
            "chat_id": "whatsapp:+212600000000",
            "from_phone": "+212600000000",
        },
    )

    assert response.status_code != 401
    assert response.status_code in {403, 422}
