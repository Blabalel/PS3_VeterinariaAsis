"""Dependencias de FastAPI para inyección de dependencias."""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models import models
from app.core import security

bearer_scheme = HTTPBearer(auto_error=False)


def get_db():
    """Provee una sesión de base de datos por request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.Usuario:
    """Valida el token Bearer y devuelve el usuario autenticado."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Debes iniciar sesión para acceder a este recurso.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    payload = security.decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tu sesión expiró. Vuelve a iniciar sesión.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        usuario_id = int(payload.get("sub", 0))
    except (TypeError, ValueError):
        raise unauthorized

    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise unauthorized
    return usuario


def require_roles(*roles: str):
    """Dependencia que restringe el acceso a los roles indicados."""

    def dependency(usuario: models.Usuario = Depends(get_current_user)):
        if usuario.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción.",
            )
        return usuario

    return dependency


def paciente_detalle(db: Session, paciente: models.Paciente):
    """Construye el diccionario de detalle de paciente con tutor."""
    tutor = db.query(models.Usuario).filter(models.Usuario.id == paciente.tutor_id).first()
    return {
        "id": paciente.id,
        "tutor_id": paciente.tutor_id,
        "nombre": paciente.nombre,
        "especie": paciente.especie,
        "raza": paciente.raza,
        "sexo": paciente.sexo,
        "fecha_nacimiento": paciente.fecha_nacimiento,
        "fecha_registro": paciente.fecha_registro,
        "peso_kg": paciente.peso_kg,
        "alergias": paciente.alergias,
        "foto_url": paciente.foto_url,
        "edad": edad_desde(paciente.fecha_nacimiento),
        "tutor": {
            "id": tutor.id,
            "nombre": tutor.nombre,
            "email": tutor.email,
            "telefono": tutor.telefono,
            "direccion": tutor.direccion,
        } if tutor else None,
    }


def edad_desde(fecha_nacimiento):
    """Calcula la edad a partir de la fecha de nacimiento."""
    if not fecha_nacimiento:
        return None

    from datetime import date
    hoy = date.today()
    total_meses = (hoy.year - fecha_nacimiento.year) * 12 + (hoy.month - fecha_nacimiento.month)
    if hoy.day < fecha_nacimiento.day:
        total_meses -= 1
    total_meses = max(total_meses, 0)

    anios, meses = divmod(total_meses, 12)
    if anios == 0:
        texto = f"{meses} {'mes' if meses == 1 else 'meses'}"
    elif meses == 0:
        texto = f"{anios} {'año' if anios == 1 else 'años'}"
    else:
        texto = f"{anios} años y {meses} meses"

    return {
        "anios": anios,
        "meses": meses,
        "total_meses": total_meses,
        "texto": texto,
    }