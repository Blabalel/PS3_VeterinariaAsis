"""Punto de entrada principal de la API Veterinaria."""
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from app.db.database import engine, ensure_schema
from app.models import models
from app.api import router

# Crea las tablas si no existen
models.Base.metadata.create_all(bind=engine)
ensure_schema()

app = FastAPI(title="API Veterinaria CNN")


@app.middleware("http")
async def avoid_stale_frontend_cache(request, call_next):
    """Evita que el navegador conserve módulos antiguos del panel tras un cambio."""
    response = await call_next(request)
    path = request.url.path
    if path in {"/", "/login", "/login.html"} or path.endswith((".js", ".css", ".html")):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


# Rutas de archivos estáticos - frontend está en la raíz del proyecto (dos niveles arriba de app/)
BASE_DIR = Path(__file__).resolve().parents[2]  # project root (PS3_VeterinariaAsis/)
FRONTEND_DIR = BASE_DIR / "frontend"
DATASET_DIR = BASE_DIR / "dataset"
NUEVAS_DIR = DATASET_DIR / "nuevas"
NUEVAS_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="frontend-css")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="frontend-js")
app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="frontend-assets")
app.mount("/dataset", StaticFiles(directory=DATASET_DIR), name="dataset")


@app.get("/health", include_in_schema=False)
@app.get("/api/health", include_in_schema=False)
def health():
    return {"status": "ok", "service": "veterinaria-api"}


@app.get("/.well-known/appspecific/com.chrome.devtools.json", include_in_schema=False)
def chrome_devtools_workspace():
    # Chrome DevTools consulta esta ruta al inspeccionar el panel.
    # Responder 204 evita un 404 ruidoso en los logs.
    return Response(status_code=204)


# Incluye las rutas bajo el prefijo /api
app.include_router(router, prefix="/api")


@app.get("/")
def read_root():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/login")
@app.get("/login.html", include_in_schema=False)
def read_login():
    return FileResponse(FRONTEND_DIR / "login.html")