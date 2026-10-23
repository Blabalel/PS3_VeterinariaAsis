"""Rutas de gestión de vacunación."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_roles
from app.schemas import schemas
from app.crud import crud_vacunacion, crud_paciente
from app.models import models

router = APIRouter()


@router.get("/vacunacion/alertas")
def listar_alertas_vacunacion(
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(get_current_user),
):
    return crud_vacunacion.obtener_alertas(db)


@router.get("/vacunacion/paciente/{paciente_id}")
def listar_vacunas(
    paciente_id: int,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(get_current_user),
):
    if not crud_paciente.obtener_paciente(db, paciente_id):
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    vacunas = crud_vacunacion.obtener_vacunas_paciente(db, paciente_id)
    return {"items": vacunas}


@router.post("/vacunacion/", response_model=schemas.VacunacionResponse)
def crear_vacuna(
    datos: schemas.VacunacionCreate,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_roles("veterinario", "admin")),
):
    if not crud_paciente.obtener_paciente(db, datos.paciente_id):
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    vacuna = crud_vacunacion.crear_vacuna(db, datos)
    return vacuna


@router.patch("/vacunacion/{vacuna_id}")
def actualizar_vacuna(
    vacuna_id: int,
    datos: schemas.VacunacionUpdate,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_roles("veterinario", "admin")),
):
    vacuna = crud_vacunacion.actualizar_vacuna(db, vacuna_id, datos)
    if not vacuna:
        raise HTTPException(status_code=404, detail="Vacuna no encontrada")
    return crud_vacunacion.serializar_vacuna(vacuna)


@router.delete("/vacunacion/{vacuna_id}")
def eliminar_vacuna(
    vacuna_id: int,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_roles("veterinario", "admin")),
):
    vacuna = crud_vacunacion.eliminar_vacuna(db, vacuna_id)
    if not vacuna:
        raise HTTPException(status_code=404, detail="Vacuna no encontrada")
    return {"mensaje": "Vacuna eliminada correctamente."}