# Services layer - Business logic
from app.services.triaje_service import calcular_triaje
from app.services.pdf_service import generar_pdf_historial

__all__ = [
    "calcular_triaje",
    "generar_pdf_historial",
]