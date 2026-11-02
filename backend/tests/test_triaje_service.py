from app.services.triaje_service import calcular_triaje

def test_cuestionario_vacio_es_insuficiente():
    puntaje, gravedad = calcular_triaje({})
    assert puntaje is None
    assert gravedad == "insuficiente"

def test_cuestionario_incompleto_es_insuficiente():
    # Con solo 1 campo presente, no debe dejar pasar el triaje como válido
    puntaje, gravedad = calcular_triaje({"sangrado_activo": True})
    assert puntaje is None
    assert gravedad == "insuficiente"

def test_triaje_leve():
    puntaje, gravedad = calcular_triaje({
        "sangrado_activo": False,
        "apetito": "normal",
        "actividad": "activo"
    })
    assert puntaje == 0
    assert gravedad == "leve"

def test_triaje_critico_por_puntaje():
    puntaje, gravedad = calcular_triaje({
        "sangrado_activo": True,  # 40 puntos
        "actividad": "inmovil",   # 30 puntos
    })
    assert puntaje == 70
    assert gravedad == "critica"

def test_temperatura_invalida_no_aplica_sustitucion():
    # Una temperatura corrupta o texto inválido no debe sumar puntos por defecto
    puntaje, gravedad = calcular_triaje({
        "sangrado_activo": False,
        "actividad": "activo",
        "temperatura_c": "texto_invalido"
    })
    assert puntaje == 0
    assert gravedad == "leve"