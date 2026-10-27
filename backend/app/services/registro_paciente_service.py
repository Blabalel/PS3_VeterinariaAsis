"""Alta de paciente y tutor en una transacción, sin modificar el triaje."""
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.models import Paciente, Usuario
from app.schemas.registro_paciente import RegistroPacienteCreate


class CorreoTutorExistente(ValueError):
    pass


class RegistroNoDisponible(RuntimeError):
    pass


def registrar_paciente_con_tutor(db: Session, datos: RegistroPacienteCreate) -> Paciente:
    email = datos.tutor.email
    try:
        if db.query(Usuario.id).filter(func.lower(Usuario.email) == email).first():
            raise CorreoTutorExistente()

        tutor = Usuario(
            nombre=datos.tutor.nombre,
            email=email,
            password_hash=hash_password(datos.tutor.password.get_secret_value()),
            rol="tutor",
            telefono=datos.tutor.telefono,
            direccion=datos.tutor.direccion,
        )
        db.add(tutor)
        db.flush()
        paciente = Paciente(**datos.paciente.model_dump(), tutor_id=tutor.id)
        db.add(paciente)
        db.flush()
        db.commit()
        db.refresh(paciente)
        return paciente
    except CorreoTutorExistente:
        db.rollback()
        raise
    except IntegrityError as error:
        db.rollback()
        # Handle two simultaneous registrations of the same email gracefully.
        if db.query(Usuario.id).filter(func.lower(Usuario.email) == email).first():
            raise CorreoTutorExistente() from error
        raise RegistroNoDisponible() from error
    except SQLAlchemyError as error:
        db.rollback()
        raise RegistroNoDisponible() from error
