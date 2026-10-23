# Utils package - Legacy compatibility
# Security moved to app.core.security
# Triaje moved to app.services.triaje_service
# PDF generation moved to app.services.pdf_service

# Re-export for backward compatibility
from app.core.security import (
    hash_password,
    verify_password,
    is_password_hashed,
    create_access_token,
    decode_access_token,
    SECRET_KEY,
    TOKEN_TTL_SECONDS,
)
from app.services.triaje_service import calcular_triaje
from app.services.pdf_service import generar_pdf_historial

__all__ = [
    "hash_password",
    "verify_password",
    "is_password_hashed",
    "create_access_token",
    "decode_access_token",
    "SECRET_KEY",
    "TOKEN_TTL_SECONDS",
    "calcular_triaje",
    "generar_pdf_historial",
]