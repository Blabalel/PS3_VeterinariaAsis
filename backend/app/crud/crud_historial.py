from sqlalchemy.orm import Session
from app.models import models
from app.schemas import schemas

def crear_historial(db: Session, historial: schemas.HistorialCreate):
    db_historial = models.HistorialClinico(**historial.model_dump())
    db.add(db_historial)
    db.commit()
    db.refresh(db_historial)
    return db_historial

def obtener_historial_por_paciente(db: Session, paciente_id: int):
    return db.query(models.HistorialClinico).filter(models.HistorialClinico.paciente_id == paciente_id).all()

def obtener_pendientes(db: Session):
    casos = db.query(models.HistorialClinico).filter(models.HistorialClinico.revisado == False).all()
    resultado = []
    for caso in casos:
        paciente = db.query(models.Paciente).filter(models.Paciente.id == caso.paciente_id).first()
        tutor = db.query(models.Usuario).filter(models.Usuario.id == paciente.tutor_id).first() if paciente else None
        
        resultado.append({
            "id": caso.id,
            "paciente_id": caso.paciente_id,
            "paciente_nombre": paciente.nombre if paciente else "Desconocido",
            "especie": paciente.especie if paciente else "Desconocido",
            "tutor_nombre": tutor.nombre if tutor else "Desconocido",
            "motivo": caso.motivo,
            "respuestas": caso.respuestas or {},
            "puntaje_riesgo": caso.puntaje_riesgo or 0,
            "nivel_gravedad": caso.nivel_gravedad or "sin clasificar",
            "fecha_consulta": caso.fecha_consulta,
            "foto_url": caso.foto_url,
            "notas_veterinario": caso.notas_veterinario,
            "estado": caso.estado,
            "revisado": caso.revisado
        })
    return resultado

def marcar_como_revisado(
    db: Session,
    historial_id: int,
    datos_revision: schemas.RevisarHistorialRequest,
    veterinario_id: int | None = None,
):
    caso = db.query(models.HistorialClinico).filter(models.HistorialClinico.id == historial_id).first()
    if caso:
        caso.revisado = True
        caso.estado = datos_revision.estado
        caso.notas_veterinario = datos_revision.notas_veterinario
        if veterinario_id is not None:
            caso.veterinario_id = veterinario_id
        db.commit()
        db.refresh(caso)
    return caso