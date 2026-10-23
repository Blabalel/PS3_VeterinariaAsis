from sqlalchemy.orm import Session
from app.models import models
from app.schemas import schemas
from app.core.security import hash_password

def crear_usuario(db: Session, usuario: schemas.UsuarioCreate):
    db_usuario = models.Usuario(
        nombre=usuario.nombre,
        email=usuario.email,
        password_hash=hash_password(usuario.password),
        rol=usuario.rol
    )
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)
    return db_usuario

def obtener_usuarios(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Usuario).offset(skip).limit(limit).all()


def obtener_usuario(db: Session, usuario_id: int):
    return db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()


def actualizar_contacto(db: Session, usuario_id: int, datos: schemas.TutorContactoUpdate):
    usuario = obtener_usuario(db, usuario_id)
    if not usuario:
        return None
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(usuario, campo, valor)
    db.commit()
    db.refresh(usuario)
    return usuario