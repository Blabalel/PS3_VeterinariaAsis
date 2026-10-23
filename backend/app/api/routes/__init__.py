# API Routes package - exports all route modules
from app.api.routes.auth import router as auth_router
from app.api.routes.usuarios import router as usuarios_router
from app.api.routes.pacientes import router as pacientes_router
from app.api.routes.historial import router as historial_router
from app.api.routes.vacunacion import router as vacunacion_router

__all__ = [
    "auth_router",
    "usuarios_router",
    "pacientes_router",
    "historial_router",
    "vacunacion_router",
]