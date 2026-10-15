from sqlalchemy.orm import Session
from app.models import models
from app.schemas import schemas

def crear_usuario(db: Session, usuario: schemas.UsuarioCreate):
    # Nota: Aquí no estamos encriptando para mantenerlo simple en Sprint 1.
    # En producción se debe usar bcrypt.
    db_usuario = models.Usuario(
        nombre=usuario.nombre,
        email=usuario.email,
        password_hash=usuario.password, 
        rol=usuario.rol
    )
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)
    return db_usuario

def obtener_usuarios(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Usuario).offset(skip).limit(limit).all()