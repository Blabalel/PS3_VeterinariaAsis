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


def obtener_paciente(db: Session, paciente_id: int):
    return db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()


def actualizar_paciente(db: Session, paciente_id: int, datos: schemas.PacienteUpdate):
    paciente = obtener_paciente(db, paciente_id)
    if not paciente:
        return None
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(paciente, campo, valor)
    db.commit()
    db.refresh(paciente)
    return paciente