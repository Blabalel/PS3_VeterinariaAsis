"""Rutas de gestión de pacientes."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_roles, paciente_detalle
from app.schemas import schemas
from app.crud import crud_paciente
from app.models import models

router = APIRouter()


@router.post("/pacientes/", response_model=schemas.PacienteResponse)
def registrar_paciente(
    paciente: schemas.PacienteCreate,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(get_current_user),
):
    return crud_paciente.crear_paciente(db=db, paciente=paciente)


@router.get("/pacientes/")
def listar_pacientes(
    tutor_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(get_current_user),
):
    query = db.query(models.Paciente)
    if tutor_id:
        query = query.filter(models.Paciente.tutor_id == tutor_id)
    pacientes = query.offset(skip).limit(limit).all()

    resultados = []
    for p in pacientes:
        tutor = db.query(models.Usuario).filter(models.Usuario.id == p.tutor_id).first()
        resultados.append({
            "id": p.id,
            "tutor_id": p.tutor_id,
            "nombre": p.nombre,
            "especie": p.especie,
            "raza": p.raza,
            "sexo": p.sexo,
            "fecha_registro": p.fecha_registro,
            "tutor_nombre": tutor.nombre if tutor else "Tutor Desconocido"
        })
    return resultados


@router.get("/pacientes/{paciente_id}")
def obtener_paciente(
    paciente_id: int,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(get_current_user),
):
    paciente = crud_paciente.obtener_paciente(db, paciente_id)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return paciente_detalle(db, paciente)


@router.patch("/pacientes/{paciente_id}")
def actualizar_paciente(
    paciente_id: int,
    datos: schemas.PacienteUpdate,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_roles("veterinario", "admin")),
):
    paciente = crud_paciente.actualizar_paciente(db, paciente_id, datos)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return paciente_detalle(db, paciente)