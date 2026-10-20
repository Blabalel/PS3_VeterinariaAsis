import os
import shutil
import json
from fastapi import APIRouter, Depends, File, UploadFile, Form, Request, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import SessionLocal
from app.schemas import schemas
from app.models import models
from app.crud import crud_paciente, crud_usuario, crud_historial, crud_vacunacion
from app.utils.triaje_engine import calcular_triaje
from app.utils.pdf_generator import generar_pdf_historial

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 1. USUARIOS (CRUD NECESARIO PARA POBLAR BD) ---
@router.post("/usuarios/", response_model=schemas.UsuarioResponse)
def registrar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    return crud_usuario.crear_usuario(db=db, usuario=usuario)

@router.get("/usuarios/", response_model=List[schemas.UsuarioResponse])
def listar_usuarios(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_usuario.obtener_usuarios(db, skip=skip, limit=limit)

# --- 2. AUTENTICACIÓN (LOGIN) ---
@router.post("/auth/login")
async def login(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    email = body.get("email")
    usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    
    if not usuario:
        usuario = models.Usuario(nombre="Equipo SF", email=email, password_hash="123", rol="admin")
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
        
    return {
        "access_token": "dev-token-san-francisco",
        "usuario": {"id": usuario.id, "nombre": usuario.nombre, "rol": usuario.rol}
    }

# --- 3. PACIENTES ---
@router.post("/pacientes/", response_model=schemas.PacienteResponse)
def registrar_paciente(paciente: schemas.PacienteCreate, db: Session = Depends(get_db)):
    return crud_paciente.crear_paciente(db=db, paciente=paciente)

@router.get("/pacientes/")
def listar_pacientes(tutor_id: Optional[int] = None, skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    query = db.query(models.Paciente)
    if tutor_id:
        query = query.filter(models.Paciente.tutor_id == tutor_id)
    pacientes = query.offset(skip).limit(limit).all()
    
    resultados = []
    for p in pacientes:
        tutor = db.query(models.Usuario).filter(models.Usuario.id == p.tutor_id).first()
        resultados.append({
            "id": p.id,
            "tutor_id": p.tutor_id,
            "nombre": p.nombre,
            "especie": p.especie,
            "raza": p.raza,
            "sexo": p.sexo,
            "fecha_registro": p.fecha_registro,
            "tutor_nombre": tutor.nombre if tutor else "Tutor Desconocido"
        })
    return resultados

# --- 4. TRIAJE ALGORÍTMICO Y RECEPCIÓN DE FOTOS ---
@router.post("/historial/triaje")
async def registrar_triaje(request: Request, db: Session = Depends(get_db)):
    content_type = request.headers.get("content-type", "")
    foto_url = None
    
    if "multipart/form-data" in content_type:
        form = await request.form()
        paciente_id = int(form.get("paciente_id"))
        motivo = form.get("motivo", "Reporte de App Móvil")
        respuestas = json.loads(form.get("respuestas", "{}"))
        foto = form.get("foto")
        
        if foto and getattr(foto, "filename", None):
            os.makedirs("../dataset/nuevas", exist_ok=True)
            file_path = f"../dataset/nuevas/{paciente_id}_{foto.filename}"
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(foto.file, buffer)
            foto_url = file_path
    else:
        body = await request.json()
        paciente_id = body.get("paciente_id")
        motivo = body.get("motivo", "Reporte de App Móvil")
        respuestas = body.get("respuestas", {})

    puntaje, gravedad = calcular_triaje(respuestas)
    
    nuevo_historial = schemas.HistorialCreate(
        paciente_id=paciente_id,
        motivo=motivo,
        respuestas=respuestas,
        puntaje_riesgo=puntaje,
        nivel_gravedad=gravedad,
        foto_url=foto_url
    )
    crud_historial.crear_historial(db, nuevo_historial)
    return {
        "mensaje": "Triaje recibido correctamente", 
        "puntaje_riesgo": puntaje, 
        "nivel_gravedad": gravedad
    }

# --- 5. PANEL VETERINARIO: CASOS PENDIENTES ---
@router.get("/historial/pendientes")
def obtener_casos_pendientes(db: Session = Depends(get_db)):
    return crud_historial.obtener_pendientes(db)

# --- 6. PANEL VETERINARIO: REVISAR CASO ---
@router.patch("/historial/{historial_id}/revisar")
def revisar_caso(historial_id: int, datos: schemas.RevisarHistorialRequest, db: Session = Depends(get_db)):
    caso = crud_historial.marcar_como_revisado(db, historial_id, datos)
    if not caso:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return caso

# --- 7. PANEL VETERINARIO: DESCARGA DE PDF ---
@router.get("/historial/paciente/{paciente_id}/pdf")
def descargar_pdf(paciente_id: int, db: Session = Depends(get_db)):
    paciente = db.query(models.Paciente).filter(models.Paciente.id == paciente_id).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    historiales = crud_historial.obtener_historial_por_paciente(db, paciente_id)
    pdf_bytes = generar_pdf_historial(paciente, historiales)
    
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=historial_{paciente.nombre}.pdf"
    })

# --- 8. HISTORIAL GENERAL ---
@router.get("/historial/{paciente_id}")
def historial_paciente(paciente_id: int, db: Session = Depends(get_db)):
    return crud_historial.obtener_historial_por_paciente(db, paciente_id)

# --- 9. VACUNACIÓN ---
@router.get("/vacunacion/paciente/{paciente_id}")
def listar_vacunas(paciente_id: int, db: Session = Depends(get_db)):
    vacunas = crud_vacunacion.obtener_vacunas_paciente(db, paciente_id)
    return {"items": vacunas}