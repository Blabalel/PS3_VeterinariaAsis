"""Servicio de triaje clínico para calcular prioridad de casos veterinarios."""
import json


def _temperatura(valor, por_defecto: float = 38.5) -> float:
    """Convierte la temperatura tolerando nulos, comas y textos inválidos."""
    if valor is None or valor == "":
        return por_defecto
    try:
        return float(str(valor).replace(",", "."))
    except (TypeError, ValueError):
        return por_defecto


def calcular_triaje(respuestas: dict) -> tuple[int, str]:
    """
    Calcula el puntaje de triaje y nivel de gravedad basado en las respuestas clínicas.

    Args:
        respuestas: Diccionario con las respuestas del formulario de triaje.
            - sangrado_activo: bool
            - apetito: "normal" | "reducido" | "no_come"
            - actividad: "activo" | "aletargado" | "inmovil"
            - temperatura_c: float
            - dolor_al_tacto: bool

    Returns:
        Tupla (puntaje: int, gravedad: str) donde gravedad es "critica", "moderada" o "leve".
    """
    if isinstance(respuestas, str):
        try:
            respuestas = json.loads(respuestas or "{}")
        except json.JSONDecodeError:
            respuestas = {}
    if not isinstance(respuestas, dict):
        respuestas = {}

    puntaje = 0

    # Sangrado
    if respuestas.get("sangrado_activo"):
        puntaje += 40

    # Apetito
    apetito = respuestas.get("apetito", "normal")
    if apetito == "no_come":
        puntaje += 20
    elif apetito == "reducido":
        puntaje += 10

    # Actividad
    actividad = respuestas.get("actividad", "activo")
    if actividad == "inmovil":
        puntaje += 30
    elif actividad == "aletargado":
        puntaje += 15

    # Temperatura
    temp = _temperatura(respuestas.get("temperatura_c"))
    if temp >= 40.0:
        puntaje += 30
    elif temp >= 39.5:
        puntaje += 15

    # Dolor
    if respuestas.get("dolor_al_tacto"):
        puntaje += 15

    # Clasificación de Gravedad
    if puntaje >= 60:
        gravedad = "critica"
    elif puntaje >= 30:
        gravedad = "moderada"
    else:
        gravedad = "leve"

    return puntaje, gravedad