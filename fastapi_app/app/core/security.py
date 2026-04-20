"""Authentication & token utilities.

Uses PyJWT for standards-compliant JWT encoding/decoding.
Password hashing uses scrypt (via hashlib) — no external dependency needed.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import jwt

from app.core.config import settings


class TokenValidationError(Exception):
    pass


@dataclass(frozen=True)
class AccessTokenClaims:
    subject: str
    role: str
    issued_at: datetime
    expires_at: datetime


@dataclass(frozen=True)
class RefreshTokenClaims:
    subject: str
    issued_at: datetime
    expires_at: datetime


# ---------------------------------------------------------------------------
# Password hashing (scrypt — unchanged, solid implementation)
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    if not password:
        raise ValueError("Password cannot be empty")

    n = 16384
    r = 8
    p = 1
    salt = os.urandom(16)
    derived_key = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=n,
        r=r,
        p=p,
        dklen=64,
    )
    return f"scrypt${n}${r}${p}${salt.hex()}${derived_key.hex()}"


def verify_password(password: str, encoded_password: str) -> bool:
    try:
        scheme, n_raw, r_raw, p_raw, salt_hex, digest_hex = encoded_password.split("$", 5)
        if scheme != "scrypt":
            return False
        n = int(n_raw)
        r = int(r_raw)
        p = int(p_raw)
        salt = bytes.fromhex(salt_hex)
        expected_digest = bytes.fromhex(digest_hex)
    except (TypeError, ValueError):
        return False

    try:
        computed_digest = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=n,
            r=r,
            p=p,
            dklen=len(expected_digest),
        )
    except ValueError:
        return False

    return hmac.compare_digest(computed_digest, expected_digest)


# ---------------------------------------------------------------------------
# Access tokens (PyJWT)
# ---------------------------------------------------------------------------

_JWT_ALGORITHM = "HS256"


def _get_secret_key() -> str:
    secret = settings.auth_secret_key.strip()
    if len(secret) < 32:
        raise RuntimeError(
            "AUTH_SECRET_KEY must be at least 32 characters. "
            "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
        )
    return secret


def create_access_token(*, subject: str, role: str) -> tuple[str, int]:
    now = datetime.now(UTC)
    ttl_seconds = max(60, settings.auth_access_token_ttl_minutes * 60)
    expires_at = now + timedelta(seconds=ttl_seconds)

    payload = {
        "sub": subject,
        "role": role,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }

    token = jwt.encode(payload, _get_secret_key(), algorithm=_JWT_ALGORITHM)
    return token, ttl_seconds


def decode_access_token(token: str) -> AccessTokenClaims:
    try:
        payload = jwt.decode(
            token,
            _get_secret_key(),
            algorithms=[_JWT_ALGORITHM],
            options={"require": ["sub", "role", "iat", "exp", "type"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenValidationError("Access token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenValidationError(f"Invalid access token: {exc}") from exc

    if payload.get("type") != "access":
        raise TokenValidationError("Token is not an access token")

    return AccessTokenClaims(
        subject=payload["sub"],
        role=payload["role"],
        issued_at=datetime.fromtimestamp(payload["iat"], UTC),
        expires_at=datetime.fromtimestamp(payload["exp"], UTC),
    )


# ---------------------------------------------------------------------------
# Refresh tokens (PyJWT)
# ---------------------------------------------------------------------------

_REFRESH_TOKEN_TTL_DAYS = 7


def create_refresh_token(*, subject: str) -> tuple[str, int]:
    now = datetime.now(UTC)
    ttl_seconds = _REFRESH_TOKEN_TTL_DAYS * 86400
    expires_at = now + timedelta(seconds=ttl_seconds)

    payload = {
        "sub": subject,
        "type": "refresh",
        "jti": secrets.token_urlsafe(16),
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }

    token = jwt.encode(payload, _get_secret_key(), algorithm=_JWT_ALGORITHM)
    return token, ttl_seconds


def decode_refresh_token(token: str) -> RefreshTokenClaims:
    try:
        payload = jwt.decode(
            token,
            _get_secret_key(),
            algorithms=[_JWT_ALGORITHM],
            options={"require": ["sub", "iat", "exp", "type"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenValidationError("Refresh token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenValidationError(f"Invalid refresh token: {exc}") from exc

    if payload.get("type") != "refresh":
        raise TokenValidationError("Token is not a refresh token")

    return RefreshTokenClaims(
        subject=payload["sub"],
        issued_at=datetime.fromtimestamp(payload["iat"], UTC),
        expires_at=datetime.fromtimestamp(payload["exp"], UTC),
    )


# ---------------------------------------------------------------------------
# WhatsApp webhook signature verification
# ---------------------------------------------------------------------------

def verify_whatsapp_signature(
    raw_body: bytes,
    signature_header: str | None,
    app_secret: str,
) -> bool:
    """Verify X-Hub-Signature-256 from Meta webhook.

    Returns True if the signature is valid. Returns False if app_secret is
    empty (dev mode) — this allows skipping verification in local development.
    """
    if not app_secret:
        return True  # Dev mode — no secret configured

    if not signature_header:
        return False

    # Format: "sha256=<hex_digest>"
    if not signature_header.startswith("sha256="):
        return False

    expected_sig = signature_header[7:]

    calculated = hmac.new(
        app_secret.encode("utf-8"),
        msg=raw_body,
        digestmod=hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(calculated, expected_sig)
