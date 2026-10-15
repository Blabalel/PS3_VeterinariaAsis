from sqlalchemy.orm import Session
from app.models import models
from app.schemas import schemas

def crear_paciente(db: Session, paciente: schemas.PacienteCreate):
    # Convierte el esquema Pydantic en un modelo SQLAlchemy
    db_paciente = models.Paciente(**paciente.model_dump())
    db.add(db_paciente)
    db.commit()
    db.refresh(db_paciente)
    return db_paciente

def obtener_pacientes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Paciente).offset(skip).limit(limit).all()