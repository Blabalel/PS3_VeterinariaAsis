from sqlalchemy.orm import Session
from app.models import models

def obtener_vacunas_paciente(db: Session, paciente_id: int):
    return db.query(models.Vacunacion).filter(models.Vacunacion.paciente_id == paciente_id).all()