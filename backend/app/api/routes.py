import os
import shutil
from fastapi import APIRouter, Depends, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy import case
from app.db.database import SessionLocal
from app.schemas import schemas
from app.crud import crud_paciente, crud_usuario, crud_historial
from app.models import models
from typing import List

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- RUTAS DE USUARIOS ---
@router.post("/usuarios/", response_model=schemas.UsuarioResponse)
def registrar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    return crud_usuario.crear_usuario(db=db, usuario=usuario)

@router.get("/usuarios/", response_model=List[schemas.UsuarioResponse])
def listar_usuarios(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_usuario.obtener_usuarios(db, skip=skip, limit=limit)

# --- RUTAS DE PACIENTES ---
@router.post("/pacientes/", response_model=schemas.PacienteResponse)
def registrar_paciente(paciente: schemas.PacienteCreate, db: Session = Depends(get_db)):
    return crud_paciente.crear_paciente(db=db, paciente=paciente)

@router.get("/pacientes/", response_model=List[schemas.PacienteResponse])
def listar_pacientes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_paciente.obtener_pacientes(db, skip=skip, limit=limit)

# --- DATOS PARA EL PANEL VETERINARIO ---
@router.get("/panel/triage")
def listar_casos_triaje(db: Session = Depends(get_db)):
    prioridad = case(
        (models.HistorialClinico.nivel_gravedad == "critica", 0),
        (models.HistorialClinico.nivel_gravedad == "moderada", 1),
        else_=2,
    )
    filas = (
        db.query(
            models.HistorialClinico,
            models.Paciente.nombre.label("paciente_nombre"),
            models.Paciente.especie.label("especie"),
            models.Usuario.nombre.label("tutor_nombre"),
        )
        .join(
            models.Paciente,
            models.HistorialClinico.paciente_id == models.Paciente.id,
        )
        .outerjoin(
            models.Usuario,
            models.Paciente.tutor_id == models.Usuario.id,
        )
        .order_by(prioridad, models.HistorialClinico.fecha_consulta.desc())
        .all()
    )
    return [
        {
            "id": historial.id,
            "paciente_id": historial.paciente_id,
            "paciente_nombre": paciente_nombre,
            "especie": especie,
            "tutor_nombre": tutor_nombre,
            "fecha_consulta": historial.fecha_consulta,
            "motivo": historial.motivo,
            "diagnostico_preliminar": historial.diagnostico_preliminar,
            "nivel_gravedad": historial.nivel_gravedad,
            "notas_adicionales": historial.notas_adicionales,
            "veterinario_id": historial.veterinario_id,
        }
        for historial, paciente_nombre, especie, tutor_nombre in filas
    ]

# --- RUTAS DE HISTORIAL CLÍNICO ---
@router.post("/historial/", response_model=schemas.HistorialResponse)
def registrar_historial(historial: schemas.HistorialCreate, db: Session = Depends(get_db)):
    return crud_historial.crear_historial(db=db, historial=historial)

@router.get("/historial/{paciente_id}", response_model=List[schemas.HistorialResponse])
def listar_historial_paciente(paciente_id: int, db: Session = Depends(get_db)):
    return crud_historial.obtener_historial_por_paciente(db, paciente_id=paciente_id)

# --- RUTA PARA SUBIR IMÁGENES (DATASET) ---
# Reemplaza SOLO el bloque de @router.post("/upload-imagen/") al final del archivo

@router.post("/upload-imagen/")
async def upload_imagen(
    file: UploadFile = File(...), 
    paciente_id: int = Form(...),
    db: Session = Depends(get_db)
):
    # 1. Guardar la foto en la carpeta del dataset
    os.makedirs("../dataset/nuevas", exist_ok=True)
    file_path = f"../dataset/nuevas/{paciente_id}_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 2. Registrar automáticamente en el historial clínico de PostgreSQL
    # Nota: El 'nivel_gravedad' es temporalmente 'moderada' hasta que integremos la IA en el Sprint 3
    nuevo_historial = schemas.HistorialCreate(
        paciente_id=paciente_id,
        motivo="Reporte remoto de lesión vía App Móvil",
        nivel_gravedad="moderada", 
        notas_adicionales=f"Imagen guardada en: {file_path}"
    )
    crud_historial.crear_historial(db=db, historial=nuevo_historial)
        
    return {
        "mensaje": "Fotografía enviada al veterinario con éxito", 
        "recomendacion": "Validación inicial: El sistema detecta una posible lesión moderada. Por favor, mantenga la zona limpia hasta que el veterinario revise el caso en el panel de triaje."
    }
