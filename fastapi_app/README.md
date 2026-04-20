# FastAPI backend base

This folder is a starter backend using:

- FastAPI
- PostgreSQL (via `asyncpg`)
- SQLAlchemy 2.x (async engine/session)
- Alembic migrations

## Local setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL:
   - `docker compose up -d`
3. Install dependencies in your Python environment.
   - `python -m pip install -e ".[dev]"`
4. Configure auth values in `.env` (minimum required):
   - `AUTH_SECRET_KEY`
   - `AUTH_INITIAL_OPERATOR_EMAIL`
   - `AUTH_INITIAL_OPERATOR_PASSWORD`
5. Run migrations:
   - `alembic upgrade head`
6. Start the API:
   - `python main.py`

## Populate realistic development data

After running migrations, seed realistic data for operators, patients, conversations,
messages, prescriptions, and pricing:

1. Run:
   - `python scripts/seed_real_world_data.py`
2. Log in from frontend `/intake` using seeded users:
   - `seed.admin@lab.local` / `SeedAdmin123!` (admin)
   - `seed.manager@lab.local` / `SeedManager123!`
   - `seed.operator@lab.local` / `SeedOperator123!`

Notes:

- The script is idempotent (safe to re-run).
- It also ensures baseline pricing rules and key catalog entries used by seeded prescriptions.

### Quick API requests

You can test all intake endpoints from:

- `http/intake_endpoints.http`
- `http/intake_endpoints.postman_collection.json`

Usage:

1. Start the API on `http://localhost:8000`.
2. Open `http/intake_endpoints.http` in your IDE REST client, or import `http/intake_endpoints.postman_collection.json` in Postman.
3. Run `POST /auth/login`, then copy the returned `access_token` into `@accessToken` or `accessToken` variable.
4. Run the webhook request first, then copy a real `conversation_id` from `GET /conversations` into `@conversationId` or `conversationId` variable.

The API health endpoint is available at:

- `GET http://localhost:8000/api/v1/health`

## Module 0: Auth and role-based access

Authentication endpoints:

- `POST /api/v1/auth/login` (operator login with email/password)
- `GET /api/v1/auth/me` (get current authenticated operator)
- `POST /api/v1/auth/operators` (admin-only operator creation)

JWT-like bearer token auth is required for operator intake endpoints:

- `GET /api/v1/conversations`
- `GET /api/v1/messages`
- `PATCH /api/v1/conversations/{conversation_id}/workflow`
- `POST /api/v1/conversations/{conversation_id}/messages/outgoing`
- `POST /api/v1/conversations/{conversation_id}/close`

Webhook routes remain public for Meta delivery:

- `GET /api/v1/whatsapp/webhook`
- `POST /api/v1/whatsapp/webhook`

Login payload example (`POST /api/v1/auth/login`):

```json
{
  "email": "operator@lab.local",
  "password": "change-me-now"
}
```

Use the returned access token:

```http
Authorization: Bearer <access_token>
```

Initial operator bootstrap:

- If `AUTH_INITIAL_OPERATOR_EMAIL` and `AUTH_INITIAL_OPERATOR_PASSWORD` are set, the app auto-creates this first operator at startup if no operator exists.
- Set `AUTH_INITIAL_OPERATOR_ROLE` to one of: `intake_operator`, `intake_manager`, `admin`.

## Module 1: WhatsApp intake API

Implemented endpoints:

- `GET /api/v1/whatsapp/webhook` (Meta verification handshake)
- `POST /api/v1/whatsapp/webhook` (ingest incoming WhatsApp message)
- `POST /api/v1/conversations/{conversation_id}/close` (send final outgoing message and close workflow)
- `POST /api/v1/conversations/{conversation_id}/messages/outgoing` (store assistant outgoing message)
- `GET /api/v1/conversations` (list conversations with status and preview)
- `GET /api/v1/messages?conversation_id=<uuid>` (list conversation messages)
- `PATCH /api/v1/conversations/{conversation_id}/workflow` (assistant workflow update)

Webhook payload example (`POST /api/v1/whatsapp/webhook`):

```json
{
  "chat_id": "whatsapp:+212600000000",
  "from_phone": "+212600000000",
  "from_name": "Patient Example",
  "message_id": "wamid.HBgMNTU1...",
  "message_type": "document",
  "text": "Bonjour, voici mon ordonnance.",
  "media_url": "https://example.com/ordonnance.pdf",
  "mime_type": "application/pdf",
  "sent_at": "2026-03-25T20:00:00Z"
}
```

Current behavior:

- Upserts patient/conversation and stores full message history.
- Detects potential prescription messages (document/image or prescription keywords).
- Creates an analysis request per conversation.
- Runs a stub prescription extraction flow (placeholder before OCR/LLM integration).
- Supports idempotency for repeated webhook payloads with same `message_id`.
- Enforces workflow status transitions for assistant updates.

Workflow update payload example (`PATCH /api/v1/conversations/{conversation_id}/workflow`):

```json
{
  "analysis_request_status": "in_review",
  "notes": "Prescription checked. Waiting for lab technician validation."
}
```

Outgoing message payload example (`POST /api/v1/conversations/{conversation_id}/messages/outgoing`):

```json
{
  "message_type": "text",
  "text": "Votre dossier est en cours de traitement."
}
```

Close conversation payload example (`POST /api/v1/conversations/{conversation_id}/close`):

```json
{
  "message": {
    "message_type": "text",
    "text": "Vos résultats sont prêts. Merci de votre confiance."
  },
  "notes": "Final message sent and request completed."
}
```

## Project structure

- `app/application.py` FastAPI app factory/module
- `app/api` API routing
- `app/core` configuration and settings
- `app/db` SQLAlchemy base and session
- `app/schemas` response schemas
- `alembic` migration configuration and versions
- `tests/unit` backend unit tests
