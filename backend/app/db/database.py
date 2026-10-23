"""Configuración de base de datos SQLAlchemy."""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# settings ya carga backend/.env mediante pydantic-settings.
SQLALCHEMY_DATABASE_URL = settings.database_url

# Crear el motor de base de datos
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Crear la sesión
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def ensure_schema():
    """Agrega columnas nuevas a bases existentes de forma idempotente.

    ``create_all`` crea tablas nuevas pero no modifica tablas ya existentes.
    Estas sentencias cubren la migración del Sprint B sin introducir Alembic.
    Están pensadas para PostgreSQL, que es el motor del proyecto.
    """
    statements = [
        "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono VARCHAR(30)",
        "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS direccion VARCHAR(255)",
        "ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS peso_kg DOUBLE PRECISION",
        "ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS alergias TEXT",
        "ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS foto_url VARCHAR(255)",
        "ALTER TABLE historial_clinico ADD COLUMN IF NOT EXISTS respuestas JSON",
        "ALTER TABLE historial_clinico ADD COLUMN IF NOT EXISTS puntaje_riesgo INTEGER DEFAULT 0",
        "ALTER TABLE historial_clinico ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'pendiente'",
        "ALTER TABLE historial_clinico ADD COLUMN IF NOT EXISTS revisado BOOLEAN DEFAULT FALSE",
        "ALTER TABLE historial_clinico ADD COLUMN IF NOT EXISTS notas_veterinario TEXT",
        "ALTER TABLE historial_clinico ADD COLUMN IF NOT EXISTS foto_url VARCHAR(255)",
        "ALTER TABLE vacunaciones ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'programada'",
        "ALTER TABLE vacunaciones ADD COLUMN IF NOT EXISTS fecha_aplicada TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE vacunaciones ADD COLUMN IF NOT EXISTS lote VARCHAR(50)",
        "ALTER TABLE vacunaciones ADD COLUMN IF NOT EXISTS notas TEXT",
    ]
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))