from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from enum import Enum

# --- ESQUEMAS DE USUARIO ---
class UsuarioBase(BaseModel):
    nombre: str
    email: str
    rol: str

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioResponse(UsuarioBase):
    id: int
    fecha_registro: datetime
    class Config:
        from_attributes = True

# --- ESQUEMAS DE PACIENTE ---
class PacienteBase(BaseModel):
    nombre: str
    especie: str
    raza: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    sexo: Optional[str] = None
    tutor_id: int

class PacienteCreate(PacienteBase):
    pass

class PacienteResponse(PacienteBase):
    id: int
    fecha_registro: datetime
    class Config:
        from_attributes = True

# --- ENUM PARA GRAVEDAD ---
class NivelGravedad(str, Enum):
    leve = "leve"
    moderada = "moderada"
    critica = "critica"

# --- ESQUEMAS DE HISTORIAL CLÍNICO ---
class HistorialBase(BaseModel):
    paciente_id: int
    veterinario_id: Optional[int] = None
    motivo: str
    diagnostico_preliminar: Optional[str] = None
    nivel_gravedad: Optional[NivelGravedad] = None 
    notas_adicionales: Optional[str] = None

class HistorialCreate(HistorialBase):
    pass

class HistorialResponse(HistorialBase):
    id: int
    fecha_consulta: datetime
    class Config:
        from_attributes = True