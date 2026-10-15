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