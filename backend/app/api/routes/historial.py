"""Rutas de historial clínico y triaje."""
import re
import shutil
import json
from pathlib import Path
from fastapi import APIRouter, Depends, Request, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_roles
from app.schemas import schemas
from app.crud import crud_historial
from app.services import calcular_triaje, generar_pdf_historial
from app.core.config import settings
from app.models import models

router = APIRouter()

NUEVAS_DIR = settings.nuevas_dir


@router.post("/historial/triaje")
async def registrar_triaje(
    request: Request,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(get_current_user),
):
    content_type = request.headers.get("content-type", "")
    foto_url = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        paciente_id = form.get("paciente_id")
        motivo = form.get("motivo", "Reporte de App Móvil")
        respuestas = form.get("respuestas", "{}")
        foto = form.get("foto")

        if foto and getattr(foto, "filename", None):
            NUEVAS_DIR.mkdir(parents=True, exist_ok=True)
            nombre_archivo = re.sub(r"[^A-Za-z0-9._-]", "_", Path(foto.filename).name)
            file_path = NUEVAS_DIR / f"{paciente_id}_{nombre_archivo}"
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(foto.file, buffer)
            # URL pública servida por FastAPI en /dataset
            foto_url = f"/dataset/nuevas/{file_path.name}"
    else:
        body = await request.json()
        paciente_id = body.get("paciente_id")
        motivo = body.get("motivo", "Reporte de App Móvil")
        respuestas = body.get("respuestas", {})

    # Normaliza entradas del panel web y de la app móvil.
    try:
        paciente_id = int(paciente_id)
        if isinstance(respuestas, str):
            respuestas = json.loads(respuestas or "{}")
        if not isinstance(respuestas, dict):
            respuestas = {}
    except (TypeError, ValueError, json.JSONDecodeError):
        raise HTTPException(
            status_code=422,
            detail="El reporte de triaje debe incluir un paciente válido y respuestas en formato JSON.",
        )

    puntaje, gravedad = calcular_triaje(respuestas)

    nuevo_historial = schemas.HistorialCreate(
        paciente_id=paciente_id,
        motivo=motivo,
        respuestas=respuestas,
        puntaje_riesgo=puntaje,
        nivel_gravedad=gravedad,
        foto_url=foto_url
    )
    crud_historial.crear_historial(db, nuevo_historial)
    return {
        "mensaje": "Triaje recibido correctamente",
        "puntaje_riesgo": puntaje,
        "nivel_gravedad": gravedad
    }


@router.get("/historial/pendientes")
def obtener_casos_pendientes(
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(get_current_user),
):
    return crud_historial.obtener_pendientes(db)


@router.patch("/historial/{historial_id}/revisar")
def revisar_caso(
    historial_id: int,
    datos: schemas.RevisarHistorialRequest,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(require_roles("veterinario", "admin")),
):
    caso = crud_historial.marcar_como_revisado(
        db,
        historial_id,
        datos,
        veterinario_id=usuario.id,
    )
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return caso


@router.get("/historial/paciente/{paciente_id}/pdf")
def descargar_pdf(
    paciente_id: int,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(get_current_user),
):
    paciente = db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    historiales = crud_historial.obtener_historial_por_paciente(db, paciente_id)
    pdf_bytes = generar_pdf_historial(paciente, historiales)

    # El nombre del paciente puede tener acentos o caracteres no válidos para
    # la cabecera HTTP; se usa un nombre ASCII seguro.
    nombre_archivo = re.sub(r"[^A-Za-z0-9_-]", "_", str(paciente.nombre or "paciente"))
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=historial_{nombre_archivo}.pdf"
    })


@router.get("/historial/{paciente_id}")
def historial_paciente(
    paciente_id: int,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(get_current_user),
):
    return crud_historial.obtener_historial_por_paciente(db, paciente_id)