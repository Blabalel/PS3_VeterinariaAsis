# Schemas package - Pydantic models
from app.schemas.schemas import (
    # Auth
    LoginRequest,
    LoginResponse,
    # Usuario
    UsuarioBase,
    UsuarioCreate,
    UsuarioResponse,
    TutorContactoUpdate,
    # Paciente
    PacienteBase,
    PacienteCreate,
    PacienteUpdate,
    PacienteResponse,
    # Historial
    HistorialBase,
    HistorialCreate,
    HistorialResponse,
    HistorialPendienteResponse,
    RevisarHistorialRequest,
    # Vacunación
    VacunacionBase,
    VacunacionCreate,
    VacunacionUpdate,
    VacunacionResponse,
)

__all__ = [
    "LoginRequest",
    "LoginResponse",
    "UsuarioBase",
    "UsuarioCreate",
    "UsuarioResponse",
    "TutorContactoUpdate",
    "PacienteBase",
    "PacienteCreate",
    "PacienteUpdate",
    "PacienteResponse",
    "HistorialBase",
    "HistorialCreate",
    "HistorialResponse",
    "HistorialPendienteResponse",
    "RevisarHistorialRequest",
    "VacunacionBase",
    "VacunacionCreate",
    "VacunacionUpdate",
    "VacunacionResponse",
]