import pytest

from app.core.security import (
    TokenValidationError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_password_and_verify_success() -> None:
    raw_password = "SuperSecret123!"

    encoded = hash_password(raw_password)

    assert encoded.startswith("scrypt$")
    assert verify_password(raw_password, encoded) is True


def test_verify_password_rejects_wrong_password() -> None:
    encoded = hash_password("CorrectPassword")

    assert verify_password("WrongPassword", encoded) is False


def test_access_token_roundtrip() -> None:
    token, ttl_seconds = create_access_token(
        subject="f66f7df8-83a4-476f-a5f1-df667f4cb4de",
        role="intake_operator",
    )

    claims = decode_access_token(token)

    assert ttl_seconds >= 60
    assert claims.subject == "f66f7df8-83a4-476f-a5f1-df667f4cb4de"
    assert claims.role == "intake_operator"
    assert claims.expires_at > claims.issued_at


def test_access_token_rejects_tampered_signature() -> None:
    token, _ = create_access_token(
        subject="f66f7df8-83a4-476f-a5f1-df667f4cb4de",
        role="intake_operator",
    )

    header, payload, signature = token.split(".")
    tampered_signature = "x" + signature[1:]
    tampered = f"{header}.{payload}.{tampered_signature}"

    with pytest.raises(TokenValidationError):
        decode_access_token(tampered)
