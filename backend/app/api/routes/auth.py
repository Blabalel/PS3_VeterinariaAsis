"""Rutas de autenticación."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.schemas import schemas
from app.core import security
from app.models import models

router = APIRouter()


@router.post("/auth/login", response_model=schemas.LoginResponse)
def login(datos: schemas.LoginRequest, db: Session = Depends(get_db)):
    from sqlalchemy import func
    email = datos.email.strip().lower()
    usuario = (
        db.query(models.Usuario)
        .filter(func.lower(models.Usuario.email) == email)
        .first()
    )

    if not usuario or not security.verify_password(datos.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Migra contraseñas antiguas en texto plano a PBKDF2 en el primer login.
    if not security.is_password_hashed(usuario.password_hash):
        usuario.password_hash = security.hash_password(datos.password)
        db.commit()
        db.refresh(usuario)

    token = security.create_access_token(usuario.id, usuario.rol, usuario.nombre)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": security.TOKEN_TTL_SECONDS,
        "usuario": {
            "id": usuario.id,
            "nombre": usuario.nombre,
            "email": usuario.email,
            "rol": usuario.rol,
        },
    }


@router.get("/auth/me")
def usuario_actual(usuario: models.Usuario = Depends(get_current_user)):
    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "email": usuario.email,
        "rol": usuario.rol,
    }


@router.post("/auth/logout")
def logout(_: models.Usuario = Depends(get_current_user)):
    # El token es stateless: el cliente debe descartarlo.
    return {"mensaje": "Sesión cerrada correctamente."}