"""Rutas de gestión de usuarios."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.schemas import schemas
from app.crud import crud_usuario
from app.models import models

router = APIRouter()


@router.post("/usuarios/", response_model=schemas.UsuarioResponse)
def registrar_usuario(
    usuario: schemas.UsuarioCreate,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_roles("admin")),
):
    return crud_usuario.crear_usuario(db=db, usuario=usuario)


@router.get("/usuarios/", response_model=List[schemas.UsuarioResponse])
def listar_usuarios(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_roles("admin")),
):
    return crud_usuario.obtener_usuarios(db, skip=skip, limit=limit)


@router.patch("/usuarios/{usuario_id}", response_model=schemas.UsuarioResponse)
def actualizar_contacto_tutor(
    usuario_id: int,
    datos: schemas.TutorContactoUpdate,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_roles("veterinario", "admin")),
):
    usuario = crud_usuario.actualizar_contacto(db, usuario_id, datos)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario