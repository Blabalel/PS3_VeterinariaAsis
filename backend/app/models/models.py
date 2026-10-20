from sqlalchemy import Column, Integer, String, Date, ForeignKey, DateTime, Text, Boolean, JSON
from sqlalchemy.sql import func
from app.db.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(20), nullable=False)
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())

class Paciente(Base):
    __tablename__ = "pacientes"
    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"))
    nombre = Column(String(100), nullable=False)
    especie = Column(String(50), nullable=False)
    raza = Column(String(50))
    fecha_nacimiento = Column(Date)
    sexo = Column(String(10))
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())

class HistorialClinico(Base):
    __tablename__ = "historial_clinico"
    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id", ondelete="CASCADE"))
    veterinario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    fecha_consulta = Column(DateTime(timezone=True), server_default=func.now())
    motivo = Column(Text, nullable=False)
    diagnostico_preliminar = Column(Text)
    nivel_gravedad = Column(String(20))
    notas_adicionales = Column(Text)
    
    # Nuevos campos requeridos por el frontend
    respuestas = Column(JSON, default={})
    puntaje_riesgo = Column(Integer, default=0)
    estado = Column(String(20), default="pendiente")
    revisado = Column(Boolean, default=False)
    notas_veterinario = Column(Text, nullable=True)
    foto_url = Column(String(255), nullable=True)

class Vacunacion(Base):
    __tablename__ = "vacunaciones"
    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id", ondelete="CASCADE"))
    nombre_vacuna = Column(String(100), nullable=False)
    fecha_programada = Column(DateTime(timezone=True))