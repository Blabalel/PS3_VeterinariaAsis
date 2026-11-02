"""Servicio de triaje clínico para calcular prioridad de casos veterinarios."""
import json
from typing import Optional, Tuple, Union


def _validar_temperatura(valor) -> Optional[float]:
    """Valida y convierte la temperatura. Retorna None si es inválida o ausente (sin sustituciones silenciosas)."""
    if valor is None or valor == "":
        return None
    try:
        temp = float(str(valor).replace(",", "."))
        if 30.0 <= temp <= 45.0:
            return temp
        return None
    except (TypeError, ValueError):
        return None


def calcular_triaje(respuestas: Union[dict, str]) -> Tuple[Optional[int], str]:
    """
    Calcula el puntaje de triaje y nivel de gravedad basado en las respuestas clínicas.

    Args:
        respuestas: Diccionario o JSON string con las respuestas del formulario.
            - sangrado_activo: bool (opcional)
            - apetito: "normal" | "reducido" | "no_come" (opcional)
            - actividad: "activo" | "aletargado" | "inmovil" (opcional)
            - temperatura_c: float / str (opcional)
            - dolor_al_tacto: bool (opcional)

    Returns:
        Tupla (puntaje: Optional[int], gravedad: str) donde gravedad es "critica", "moderada", "leve" o "insuficiente".
    """
    if isinstance(respuestas, str):
        try:
            respuestas = json.loads(respuestas or "{}")
        except json.JSONDecodeError:
            respuestas = {}
    if not isinstance(respuestas, dict):
        respuestas = {}

    # Criterio de aceptación: Evitar clasificar automáticamente como Leve información insuficiente.
    campos_claves = ["sangrado_activo", "apetito", "actividad", "temperatura_c", "dolor_al_tacto"]
    valores_presentes = [k for k in campos_claves if respuestas.get(k) is not None and respuestas.get(k) != ""]
    
    if len(valores_presentes) < 2:
        return None, "insuficiente"

    puntaje = 0

    # Sangrado
    sangrado = respuestas.get("sangrado_activo")
    if sangrado is True:
        puntaje += 40

    # Apetito
    apetito = respuestas.get("apetito")
    if apetito == "no_come":
        puntaje += 20
    elif apetito == "reducido":
        puntaje += 10

    # Actividad
    actividad = respuestas.get("actividad")
    if actividad == "inmovil":
        puntaje += 30
    elif actividad == "aletargado":
        puntaje += 15

    # Temperatura
    temp = _validar_temperatura(respuestas.get("temperatura_c"))
    if temp is not None:
        if temp >= 40.0:
            puntaje += 30
        elif temp >= 39.5:
            puntaje += 15

    # Dolor
    if respuestas.get("dolor_al_tacto") is True:
        puntaje += 15

    # Clasificación de Gravedad
    if puntaje >= 60:
        gravedad = "critica"
    elif puntaje >= 30:
        gravedad = "moderada"
    else:
        gravedad = "leve"

    return puntaje, gravedad