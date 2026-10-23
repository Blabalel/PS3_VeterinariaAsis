from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.models import models
from app.schemas import schemas


def _fecha(valor):
    if not valor:
        return None
    if isinstance(valor, datetime):
        return valor.date()
    return valor


def estado_visual(vacuna: models.Vacunacion, hoy: date | None = None) -> str:
    """Calcula el estado que ve el usuario sin depender de tareas programadas."""
    hoy = hoy or date.today()
    if (vacuna.estado or "").lower() == "cancelada":
        return "cancelada"
    if (vacuna.estado or "").lower() == "aplicada" or vacuna.fecha_aplicada:
        return "aplicada"

    fecha = _fecha(vacuna.fecha_programada)
    if fecha is None:
        return "programada"
    if fecha < hoy:
        return "vencida"
    if (fecha - hoy).days <= 30:
        return "proxima"
    return "programada"


def dias_restantes(vacuna: models.Vacunacion, hoy: date | None = None):
    fecha = _fecha(vacuna.fecha_programada)
    if fecha is None:
        return None
    return (fecha - (hoy or date.today())).days


def serializar_vacuna(vacuna: models.Vacunacion, hoy: date | None = None) -> dict:
    return {
        "id": vacuna.id,
        "paciente_id": vacuna.paciente_id,
        "nombre_vacuna": vacuna.nombre_vacuna,
        "fecha_programada": vacuna.fecha_programada,
        "estado": vacuna.estado or "programada",
        "estado_visual": estado_visual(vacuna, hoy),
        "fecha_aplicada": vacuna.fecha_aplicada,
        "lote": vacuna.lote,
        "notas": vacuna.notas,
        "dias_restantes": dias_restantes(vacuna, hoy),
    }


def obtener_vacunas_paciente(db: Session, paciente_id: int):
    vacunas = (
        db.query(models.Vacunacion)
        .filter(models.Vacunacion.paciente_id == paciente_id)
        .order_by(models.Vacunacion.fecha_programada.asc())
        .all()
    )
    return [serializar_vacuna(vacuna) for vacuna in vacunas]


def obtener_alertas(db: Session):
    """Devuelve refuerzos pendientes de todos los pacientes, con datos del tutor."""
    hoy = date.today()
    vacunas = (
        db.query(models.Vacunacion)
        .order_by(models.Vacunacion.fecha_programada.asc())
        .all()
    )

    resultados = []
    for vacuna in vacunas:
        visual = estado_visual(vacuna, hoy)
        if visual in ("aplicada", "cancelada"):
            continue

        paciente = (
            db.query(models.Paciente)
            .filter(models.Paciente.id == vacuna.paciente_id)
            .first()
        )
        tutor = (
            db.query(models.Usuario)
            .filter(models.Usuario.id == paciente.tutor_id)
            .first()
            if paciente
            else None
        )

        resultados.append({
            **serializar_vacuna(vacuna, hoy),
            "paciente_nombre": paciente.nombre if paciente else "Desconocido",
            "especie": paciente.especie if paciente else "—",
            "tutor_nombre": tutor.nombre if tutor else "Desconocido",
            "tutor_telefono": tutor.telefono if tutor else None,
        })
    return resultados


def obtener_vacuna(db: Session, vacuna_id: int):
    return db.query(models.Vacunacion).filter(models.Vacunacion.id == vacuna_id).first()


def crear_vacuna(db: Session, datos: schemas.VacunacionCreate):
    vacuna = models.Vacunacion(**datos.model_dump())
    db.add(vacuna)
    db.commit()
    db.refresh(vacuna)
    return vacuna


def actualizar_vacuna(db: Session, vacuna_id: int, datos: schemas.VacunacionUpdate):
    vacuna = obtener_vacuna(db, vacuna_id)
    if not vacuna:
        return None

    cambios = datos.model_dump(exclude_unset=True)

    if cambios.get("estado") == "aplicada" and not cambios.get("fecha_aplicada") and not vacuna.fecha_aplicada:
        cambios["fecha_aplicada"] = datetime.now(timezone.utc)
    if cambios.get("fecha_aplicada") and not cambios.get("estado"):
        cambios["estado"] = "aplicada"
    if cambios.get("estado") == "programada":
        cambios["fecha_aplicada"] = None

    for campo, valor in cambios.items():
        setattr(vacuna, campo, valor)
    db.commit()
    db.refresh(vacuna)
    return vacuna


def eliminar_vacuna(db: Session, vacuna_id: int):
    vacuna = obtener_vacuna(db, vacuna_id)
    if not vacuna:
        return None
    db.delete(vacuna)
    db.commit()
    return vacuna
