# API package - Main router with all endpoints
from fastapi import APIRouter

from app.api.routes import (
    auth_router,
    usuarios_router,
    pacientes_router,
    historial_router,
    vacunacion_router,
)

# Router principal que incluye todas las rutas bajo /api
router = APIRouter()

router.include_router(auth_router)
router.include_router(usuarios_router)
router.include_router(pacientes_router)
router.include_router(historial_router)
router.include_router(vacunacion_router)

__all__ = ["router"]