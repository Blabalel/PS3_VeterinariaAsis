from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.db.database import engine
from app.models import models
from app.api.routes import router

# Crea las tablas si no existen
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Veterinaria CNN")

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="frontend-css")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="frontend-js")
app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="frontend-assets")

# Incluye las rutas bajo el prefijo /api
app.include_router(router, prefix="/api")

@app.get("/")
def read_root():
    return FileResponse(FRONTEND_DIR / "index.html")
