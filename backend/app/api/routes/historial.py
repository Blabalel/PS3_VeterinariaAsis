"""Rutas de historial clínico y triaje."""
import json
import re

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile

from app.api.deps import get_current_user, get_db, paciente_accesible, require_roles
from app.crud import crud_historial
from app.models import models
from app.schemas import schemas
from app.services import calcular_triaje, generar_pdf_historial
from app.services.triage_photos import MAX_PHOTO_BYTES, photo_url, read_photo, store_photo

router = APIRouter()


@router.post("/historial/triaje")
async def registrar_triaje(
    request: Request,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    try:
        if "multipart/form-data" in request.headers.get("content-type", ""):
            length = request.headers.get("content-length")
            if length and int(length) > MAX_PHOTO_BYTES + 1024 * 1024:
                raise HTTPException(status_code=413, detail="La solicitud es demasiado grande.")
            async with request.form(max_files=1, max_fields=3) as form:
                datos = dict(form)
                foto = datos.pop("foto", None)
                if foto is not None and not isinstance(foto, UploadFile):
                    raise ValueError("foto inválida")
                foto_bytes = await foto.read(MAX_PHOTO_BYTES + 1) if foto else None
        else:
            datos = await request.json()
            foto_bytes = None

        if not isinstance(datos, dict):
            raise ValueError("reporte inválido")
        id_recibido = datos.get("paciente_id")
        if type(id_recibido) not in (int, str):
            raise ValueError("paciente inválido")
        paciente_id = int(id_recibido)
        if not 0 < paciente_id <= 2147483647:
            raise ValueError("paciente inválido")
        motivo = datos.get("motivo", "Reporte de App Móvil")
        respuestas = datos.get("respuestas", {})
        if isinstance(respuestas, str):
            respuestas = json.loads(respuestas or "{}")
        if not isinstance(motivo, str) or not isinstance(respuestas, dict):
            raise ValueError("reporte inválido")
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="El reporte debe incluir un paciente válido y respuestas en formato JSON.") from exc

    return await run_in_threadpool(guardar_triaje, db, usuario, paciente_id, motivo, respuestas, foto_bytes)


def guardar_triaje(db, usuario, paciente_id, motivo, respuestas, foto_bytes):
    paciente_accesible(db, paciente_id, usuario)
    puntaje, gravedad = calcular_triaje(respuestas)
    datos = schemas.HistorialCreate(
        paciente_id=paciente_id,
        motivo=motivo,
        respuestas=respuestas,
        puntaje_riesgo=puntaje,
        nivel_gravedad=gravedad,
    )
    caso = crud_historial.crear_historial(db, datos)
    if foto_bytes is not None:
        caso.foto_url = store_photo(foto_bytes)
    db.commit()
    return {
        "mensaje": "Triaje recibido correctamente",
        "puntaje_riesgo": puntaje,
        "nivel_gravedad": gravedad,
    }


@router.get("/historial/pendientes")
def obtener_casos_pendientes(
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(require_roles("veterinario", "admin")),
):
    return crud_historial.obtener_pendientes(db)


@router.get("/historial/{historial_id}/foto")
def descargar_foto(
    historial_id: int,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    caso = db.get(models.HistorialClinico, historial_id)
    if not caso or not caso.foto_url:
        raise HTTPException(status_code=404, detail="Fotografía no encontrada.")
    paciente_accesible(db, caso.paciente_id, usuario)
    foto, media_type = read_photo(caso.foto_url)
    return Response(foto, media_type=media_type, headers={
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
    })


@router.patch("/historial/{historial_id}/revisar")
def revisar_caso(
    historial_id: int,
    datos: schemas.RevisarHistorialRequest,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(require_roles("veterinario", "admin")),
):
    caso = crud_historial.marcar_como_revisado(db, historial_id, datos, veterinario_id=usuario.id)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return historial_response(caso)


@router.get("/historial/paciente/{paciente_id}/pdf")
def descargar_pdf(
    paciente_id: int,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    paciente = paciente_accesible(db, paciente_id, usuario)
    historiales = crud_historial.obtener_historial_por_paciente(db, paciente_id)
    pdf_bytes = generar_pdf_historial(paciente, historiales)

    nombre_archivo = re.sub(r"[^A-Za-z0-9_-]", "_", str(paciente.nombre or "paciente"))
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=historial_{nombre_archivo}.pdf",
        "Cache-Control": "private, no-store",
    })


@router.get("/historial/{paciente_id}")
def historial_paciente(
    paciente_id: int,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    paciente_accesible(db, paciente_id, usuario)
    return [historial_response(caso) for caso in crud_historial.obtener_historial_por_paciente(db, paciente_id)]


def historial_response(caso):
    # Conserva los atributos de registros anteriores y sólo sustituye la referencia interna.
    return {**{column.name: getattr(caso, column.name) for column in models.HistorialClinico.__table__.columns},
            "foto_url": photo_url(caso)}
