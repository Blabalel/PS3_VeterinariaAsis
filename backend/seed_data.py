"""Puebla la base con 10 registros de prueba (idempotente).

Uso:
    cd backend
    venv\\Scripts\\python.exe seed_data.py

Crea 10 tutores, 1 veterinario, 1 administrador, 10 pacientes, un triaje por
paciente y vacunas programadas. Si un registro ya existe (mismo email o mismo
paciente del tutor) no lo duplica.
"""

from datetime import date, datetime, timedelta

from app.db.database import SessionLocal, engine
from app.models import models
from app.utils.triaje_engine import calcular_triaje

HOY = date.today()

VETERINARIO = {"nombre": "Dra. Valeria Quispe", "email": "vet@sanfrancisco.bo", "rol": "veterinario"}
ADMIN = {"nombre": "Equipo San Francisco", "email": "admin@sanfrancisco.bo", "rol": "admin"}

TUTORES = [
    {"nombre": "María Fernanda Rojas", "email": "maria.rojas@example.com"},
    {"nombre": "Diego Alarcón", "email": "diego.alarcon@example.com"},
    {"nombre": "Lucía Vargas", "email": "lucia.vargas@example.com"},
    {"nombre": "Pablo Soria", "email": "pablo.soria@example.com"},
    {"nombre": "Ana Belén Mamani", "email": "ana.mamani@example.com"},
    {"nombre": "Carlos Quisbert", "email": "carlos.quisbert@example.com"},
    {"nombre": "Sofía Ticona", "email": "sofia.ticona@example.com"},
    {"nombre": "Jorge Villarroel", "email": "jorge.villarroel@example.com"},
    {"nombre": "Camila Choque", "email": "camila.choque@example.com"},
    {"nombre": "Rodrigo Paredes", "email": "rodrigo.paredes@example.com"},
]

# (nombre, especie, raza, sexo, meses_edad, indice_tutor)
PACIENTES = [
    ("Luna", "Canino", "Labrador mestiza", "Hembra", 36, 0),
    ("Milo", "Felino", "Doméstico de pelo corto", "Macho", 24, 1),
    ("Canela", "Canino", "Cocker spaniel", "Hembra", 18, 2),
    ("Nube", "Felino", "Mestizo", "Hembra", 8, 3),
    ("Rocky", "Canino", "Bulldog francés", "Macho", 48, 4),
    ("Simba", "Felino", "Siamés", "Macho", 30, 5),
    ("Kira", "Canino", "Pastor alemán", "Hembra", 60, 6),
    ("Toby", "Canino", "Beagle", "Macho", 12, 7),
    ("Misha", "Felino", "Persa", "Hembra", 42, 8),
    ("Bruno", "Canino", "Mestizo", "Macho", 20, 9),
]

# (motivo, respuestas) en el mismo orden que PACIENTES
CASOS = [
    (
        "Herida profunda en la pata trasera con sangrado persistente.",
        {
            "sangrado_activo": True,
            "apetito": "no_come",
            "actividad": "inmovil",
            "temperatura_c": 40.2,
            "dolor_al_tacto": True,
            "observaciones": "Corte en la almohadilla; el sangrado no se detuvo en 20 minutos.",
        },
    ),
    (
        "Decaimiento y poco apetito desde ayer.",
        {
            "sangrado_activo": False,
            "apetito": "reducido",
            "actividad": "aletargado",
            "temperatura_c": 39.6,
            "dolor_al_tacto": True,
            "observaciones": "Toma agua, pero dejó parte de su comida y duerme más de lo habitual.",
        },
    ),
    (
        "Irritación leve entre los dedos después del paseo.",
        {
            "sangrado_activo": False,
            "apetito": "normal",
            "actividad": "activo",
            "temperatura_c": 38.5,
            "dolor_al_tacto": False,
            "observaciones": "Pequeña irritación; come y juega con normalidad.",
        },
    ),
    (
        "Estornudos frecuentes y secreción nasal.",
        {
            "sangrado_activo": False,
            "apetito": "normal",
            "actividad": "aletargado",
            "temperatura_c": 39.5,
            "dolor_al_tacto": False,
            "observaciones": "Estornuda desde hace dos días; sin fiebre alta.",
        },
    ),
    (
        "Cojera repentina del miembro anterior derecho.",
        {
            "sangrado_activo": False,
            "apetito": "no_come",
            "actividad": "aletargado",
            "temperatura_c": 39.0,
            "dolor_al_tacto": True,
            "observaciones": "No apoya la pata al caminar y se queja al tocarla.",
        },
    ),
    (
        "Vómitos repetidos en las últimas horas.",
        {
            "sangrado_activo": False,
            "apetito": "no_come",
            "actividad": "aletargado",
            "temperatura_c": 38.8,
            "dolor_al_tacto": False,
            "observaciones": "Vomitó tres veces; aún toma agua en pequeñas cantidades.",
        },
    ),
    (
        "Picazón constante en el lomo.",
        {
            "sangrado_activo": False,
            "apetito": "reducido",
            "actividad": "activo",
            "temperatura_c": 38.6,
            "dolor_al_tacto": False,
            "observaciones": "Se rasca con frecuencia; se observan zonas enrojecidas.",
        },
    ),
    (
        "No quiere caminar ni subir escaleras.",
        {
            "sangrado_activo": False,
            "apetito": "normal",
            "actividad": "inmovil",
            "temperatura_c": 38.7,
            "dolor_al_tacto": False,
            "observaciones": "Se queda echado y evita moverse.",
        },
    ),
    (
        "Molestia al orinar.",
        {
            "sangrado_activo": False,
            "apetito": "normal",
            "actividad": "activo",
            "temperatura_c": 38.4,
            "dolor_al_tacto": True,
            "observaciones": "Entra varias veces al arenero y permanece poco tiempo.",
        },
    ),
    (
        "Caída desde una altura y sangrado en el hocico.",
        {
            "sangrado_activo": True,
            "apetito": "normal",
            "actividad": "inmovil",
            "temperatura_c": 39.0,
            "dolor_al_tacto": True,
            "observaciones": "Sangrado leve en el hocico; no apoya una pata trasera.",
        },
    ),
]

# (nombre_vacuna, dias_hasta_proximo_refuerzo) en el mismo orden que PACIENTES
VACUNAS = [
    ("Rabia", 30),
    ("Triple felina", 45),
    ("Séxtuple canina", 90),
    ("Leucemia felina", 60),
    ("Séxtuple canina", 120),
    ("Triple felina", 30),
    ("Rabia", 75),
    ("Séxtuple canina", 15),
    ("Leucemia felina", 90),
    ("Rabia", 60),
]


def obtener_o_crear_usuario(db, datos, password="123456"):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == datos["email"]).first()
    if usuario:
        return usuario
    usuario = models.Usuario(
        nombre=datos["nombre"],
        email=datos["email"],
        password_hash=password,
        rol=datos.get("rol", "tutor"),
    )
    db.add(usuario)
    db.flush()
    return usuario


def main():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    creados = {"usuarios": 0, "pacientes": 0, "triajes": 0, "vacunas": 0}

    try:
        obtener_o_crear_usuario(db, VETERINARIO)
        obtener_o_crear_usuario(db, ADMIN)
        tutores = [obtener_o_crear_usuario(db, t) for t in TUTORES]
        db.commit()

        veterinario = (
            db.query(models.Usuario)
            .filter(models.Usuario.email == VETERINARIO["email"])
            .first()
        )

        for indice, (nombre, especie, raza, sexo, meses, tutor_idx) in enumerate(PACIENTES):
            tutor = tutores[tutor_idx]
            paciente = (
                db.query(models.Paciente)
                .filter(models.Paciente.nombre == nombre, models.Paciente.tutor_id == tutor.id)
                .first()
            )
            if not paciente:
                paciente = models.Paciente(
                    tutor_id=tutor.id,
                    nombre=nombre,
                    especie=especie,
                    raza=raza,
                    sexo=sexo,
                    fecha_nacimiento=HOY - timedelta(days=meses * 30),
                )
                db.add(paciente)
                db.flush()
                creados["pacientes"] += 1

            motivo, respuestas = CASOS[indice]
            tiene_historial = (
                db.query(models.HistorialClinico)
                .filter(models.HistorialClinico.paciente_id == paciente.id)
                .first()
            )
            if not tiene_historial:
                puntaje, gravedad = calcular_triaje(respuestas)
                db.add(
                    models.HistorialClinico(
                        paciente_id=paciente.id,
                        veterinario_id=veterinario.id if veterinario else None,
                        motivo=motivo,
                        respuestas=respuestas,
                        puntaje_riesgo=puntaje,
                        nivel_gravedad=gravedad,
                        estado="pendiente",
                        revisado=False,
                    )
                )
                creados["triajes"] += 1

            tiene_vacuna = (
                db.query(models.Vacunacion)
                .filter(models.Vacunacion.paciente_id == paciente.id)
                .first()
            )
            if not tiene_vacuna:
                nombre_vacuna, dias = VACUNAS[indice]
                db.add(
                    models.Vacunacion(
                        paciente_id=paciente.id,
                        nombre_vacuna=nombre_vacuna,
                        fecha_programada=datetime.now() + timedelta(days=dias),
                    )
                )
                creados["vacunas"] += 1

        db.commit()
        creados["usuarios"] = db.query(models.Usuario).count()

        print("Seed completado:")
        print(f"  usuarios: {creados['usuarios']} (nuevos en esta ejecucion no se duplican)")
        print(f"  pacientes nuevos: {creados['pacientes']}")
        print(f"  triajes nuevos: {creados['triajes']}")
        print(f"  vacunas nuevas: {creados['vacunas']}")

        print("\nCasos registrados:")
        for paciente in db.query(models.Paciente).order_by(models.Paciente.id).all():
            caso = (
                db.query(models.HistorialClinico)
                .filter(models.HistorialClinico.paciente_id == paciente.id)
                .order_by(models.HistorialClinico.id.desc())
                .first()
            )
            if caso:
                print(
                    f"  #{paciente.id:>2} {paciente.nombre:<7} {paciente.especie:<7} "
                    f"-> {caso.nivel_gravedad:<8} ({caso.puntaje_riesgo} pts)"
                )
    finally:
        db.close()


if __name__ == "__main__":
    main()
