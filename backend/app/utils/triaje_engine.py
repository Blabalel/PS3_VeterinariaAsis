def calcular_triaje(respuestas: dict):
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
    temp = float(respuestas.get("temperatura_c", 38.5))
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