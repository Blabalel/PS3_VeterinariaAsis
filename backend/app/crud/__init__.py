# CRUD package - Database operations
from app.crud.crud_usuario import (
    crear_usuario,
    obtener_usuarios,
    obtener_usuario,
    actualizar_contacto,
)
from app.crud.crud_paciente import (
    crear_paciente,
    obtener_pacientes,
    obtener_paciente,
    actualizar_paciente,
)
from app.crud.crud_historial import (
    crear_historial,
    obtener_historial_por_paciente,
    obtener_pendientes,
    marcar_como_revisado,
)
from app.crud.crud_vacunacion import (
    obtener_vacunas_paciente,
    obtener_alertas,
    obtener_vacuna,
    crear_vacuna,
    actualizar_vacuna,
    eliminar_vacuna,
    serializar_vacuna,
    estado_visual,
    dias_restantes,
)

__all__ = [
    # Usuario
    "crear_usuario",
    "obtener_usuarios",
    "obtener_usuario",
    "actualizar_contacto",
    # Paciente
    "crear_paciente",
    "obtener_pacientes",
    "obtener_paciente",
    "actualizar_paciente",
    # Historial
    "crear_historial",
    "obtener_historial_por_paciente",
    "obtener_pendientes",
    "marcar_como_revisado",
    # Vacunación
    "obtener_vacunas_paciente",
    "obtener_alertas",
    "obtener_vacuna",
    "crear_vacuna",
    "actualizar_vacuna",
    "eliminar_vacuna",
    "serializar_vacuna",
    "estado_visual",
    "dias_restantes",
]