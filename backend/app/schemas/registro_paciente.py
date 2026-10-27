"""Contrato exclusivo para el alta conjunta desde el panel clínico."""
import re
from datetime import date, datetime, timedelta, timezone

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator

from app.schemas.schemas import PacienteResponse


class NuevoTutor(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    nombre: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=3, max_length=100)
    password: SecretStr = Field(min_length=8, max_length=128)
    telefono: str | None = Field(default=None, max_length=30)
    direccion: str | None = Field(default=None, max_length=255)

    @field_validator("email")
    @classmethod
    def validar_correo(cls, value: str) -> str:
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Introduce un correo electrónico válido.")
        return value.lower()


class NuevoPaciente(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    nombre: str = Field(min_length=1, max_length=100)
    especie: str = Field(min_length=1, max_length=50)
    raza: str | None = Field(default=None, max_length=50)
    fecha_nacimiento: date | None = None
    sexo: str | None = Field(default=None, max_length=10)
    peso_kg: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    alergias: str | None = Field(default=None, max_length=2000)

    @field_validator("fecha_nacimiento")
    @classmethod
    def validar_nacimiento(cls, value: date | None) -> date | None:
        hoy = datetime.now(timezone(timedelta(hours=-4))).date()
        if value and value > hoy:
            raise ValueError("La fecha de nacimiento no puede ser futura.")
        return value


class RegistroPacienteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tutor: NuevoTutor
    paciente: NuevoPaciente


class TutorRegistrado(BaseModel):
    id: int
    nombre: str
    email: str
    telefono: str | None = None
    direccion: str | None = None


class RegistroPacienteResponse(PacienteResponse):
    tutor: TutorRegistrado
