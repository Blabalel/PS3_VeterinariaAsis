"""Utilidades de seguridad sin dependencias externas.

- Hash de contraseñas con PBKDF2-SHA256.
- Tokens de sesión firmados con HMAC-SHA256 (formato JWT-like).

Se usa la librería estándar para no agregar dependencias al proyecto.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-san-francisco-change-me")
TOKEN_TTL_SECONDS = int(os.getenv("TOKEN_TTL_SECONDS", str(7 * 24 * 60 * 60)))
PBKDF2_ITERATIONS = 120_000


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str) -> str:
    """Devuelve un hash con sal aleatoria en formato pbkdf2_sha256$sal$hash."""
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        str(password).encode("utf-8"),
        bytes.fromhex(salt),
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${salt}${digest.hex()}"


def is_password_hashed(stored: str | None) -> bool:
    return isinstance(stored, str) and stored.startswith("pbkdf2_sha256$")


def verify_password(password: str, stored: str | None) -> bool:
    """Valida una contraseña y mantiene compatibilidad con valores en texto plano."""
    if not password or not stored:
        return False

    if is_password_hashed(stored):
        try:
            _, salt, expected = stored.split("$", 2)
        except ValueError:
            return False
        candidate = hashlib.pbkdf2_hmac(
            "sha256",
            str(password).encode("utf-8"),
            bytes.fromhex(salt),
            PBKDF2_ITERATIONS,
        )
        return hmac.compare_digest(candidate.hex(), expected)

    # Compatibilidad con registros antiguos (texto plano). Al iniciar sesión
    # correctamente, la ruta de login reemplaza el valor por un hash.
    return hmac.compare_digest(str(stored), str(password))


def create_access_token(usuario_id: int, rol: str, nombre: str) -> str:
    """Crea un token firmado con expiración."""
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(usuario_id),
        "rol": rol,
        "nombre": nombre,
        "iat": now,
        "exp": now + TOKEN_TTL_SECONDS,
    }
    segments = "{}.{}".format(
        _b64encode(json.dumps(header, separators=(",", ":")).encode("utf-8")),
        _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")),
    )
    signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        segments.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{segments}.{_b64encode(signature)}"


def decode_access_token(token: str | None) -> dict | None:
    """Devuelve el payload si la firma y la expiración son válidas."""
    if not token or token.count(".") != 2:
        return None

    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
        signing_input = f"{header_b64}.{payload_b64}"
        expected = hmac.new(
            SECRET_KEY.encode("utf-8"),
            signing_input.encode("ascii"),
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(expected, _b64decode(signature_b64)):
            return None

        header = json.loads(_b64decode(header_b64))
        if header.get("alg") != "HS256":
            return None

        payload = json.loads(_b64decode(payload_b64))
        if int(payload.get("exp", 0)) <= int(time.time()):
            return None
        return payload
    except (ValueError, TypeError, json.JSONDecodeError, UnicodeDecodeError):
        return None
