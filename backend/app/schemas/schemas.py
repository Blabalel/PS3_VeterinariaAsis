from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, Dict, Any

# --- AUTH ---
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    usuario: dict

# --- USUARIO ---
class UsuarioBase(BaseModel):
    nombre: str
    email: str
    rol: str

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioResponse(UsuarioBase):
    id: int
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    fecha_registro: datetime
    class Config:
        from_attributes = True

class TutorContactoUpdate(BaseModel):
    telefono: Optional[str] = None
    direccion: Optional[str] = None

# --- PACIENTE ---
class PacienteBase(BaseModel):
    nombre: str
    especie: str
    raza: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    sexo: Optional[str] = None
    peso_kg: Optional[float] = None
    alergias: Optional[str] = None
    foto_url: Optional[str] = None
    tutor_id: int

class PacienteCreate(PacienteBase):
    pass

class PacienteUpdate(BaseModel):
    nombre: Optional[str] = None
    especie: Optional[str] = None
    raza: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    sexo: Optional[str] = None
    peso_kg: Optional[float] = None
    alergias: Optional[str] = None
    foto_url: Optional[str] = None

class PacienteResponse(PacienteBase):
    id: int
    fecha_registro: datetime
    tutor_nombre: Optional[str] = None
    class Config:
        from_attributes = True

# --- HISTORIAL CLÍNICO ---
class HistorialBase(BaseModel):
    paciente_id: int
    veterinario_id: Optional[int] = None
    motivo: str
    diagnostico_preliminar: Optional[str] = None
    nivel_gravedad: Optional[str] = None 
    notas_adicionales: Optional[str] = None
    respuestas: Optional[Dict[str, Any]] = {}
    puntaje_riesgo: Optional[int] = 0
    foto_url: Optional[str] = None

class HistorialCreate(HistorialBase):
    pass

class HistorialResponse(HistorialBase):
    id: int
    fecha_consulta: datetime
    estado: str
    revisado: bool
    notas_veterinario: Optional[str] = None
    class Config:
        from_attributes = True

class HistorialPendienteResponse(BaseModel):
    id: int
    paciente_id: int
    paciente_nombre: str
    especie: str
    tutor_nombre: str
    motivo: str
    respuestas: Dict[str, Any]
    puntaje_riesgo: int
    nivel_gravedad: str
    fecha_consulta: datetime
    foto_url: Optional[str] = None
    notas_veterinario: Optional[str] = None
    estado: str
    revisado: bool

class RevisarHistorialRequest(BaseModel):
    estado: str
    notas_veterinario: str

# --- VACUNACIÓN ---
class VacunacionBase(BaseModel):
    paciente_id: int
    nombre_vacuna: str
    fecha_programada: Optional[datetime] = None
    estado: Optional[str] = "programada"
    fecha_aplicada: Optional[datetime] = None
    lote: Optional[str] = None
    notas: Optional[str] = None

class VacunacionCreate(VacunacionBase):
    pass

class VacunacionUpdate(BaseModel):
    nombre_vacuna: Optional[str] = None
    fecha_programada: Optional[datetime] = None
    estado: Optional[str] = None
    fecha_aplicada: Optional[datetime] = None
    lote: Optional[str] = None
    notas: Optional[str] = None

class VacunacionResponse(VacunacionBase):
    id: int
    class Config:
        from_attributes = True