# ProyectSystem3Veterinaria_Asis

Sistema de triaje veterinario con panel web, API y app móvil.

- `backend/`: API REST con FastAPI + SQLAlchemy + PostgreSQL. También sirve el panel web.
- `frontend/`: panel veterinario (HTML/CSS/JS, sin build).
- `app_movil/`: aplicación Flutter (fuera del alcance de esta guía).

## Requisitos

- Python 3.10 o superior (probado con 3.14).
- PostgreSQL en ejecución.
- Navegador moderno.

## 1. Configurar la base de datos

Crea la base (si no existe). Con `psql`:

```sql
CREATE DATABASE veterinaria_cnn_db;
```

Copia `backend/.env.example` a `backend/.env` y ajusta usuario/contraseña:

```
DATABASE_URL=postgresql+psycopg2://postgres:TU_PASSWORD@localhost:5432/veterinaria_cnn_db
```

> Usa el driver explícito `+psycopg2`: SQLAlchemy 2.1 cambió el driver por defecto a `psycopg` (v3).

## 2. Instalar dependencias del backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

## 3. Crear tablas y datos de prueba

Las tablas se crean automáticamente al importar `main.py`. Para poblar la base con datos de demostración (idempotente, no duplica si ya existen):

```powershell
.\venv\Scripts\python.exe seed_data.py
```

Genera 12 usuarios, 10 pacientes, 10 triajes (2 críticos, 5 moderados, 3 leves) y 10 vacunas programadas.

## 4. Ejecutar el sistema

```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

- Panel veterinario: <http://127.0.0.1:8000/>
- Documentación interactiva (Swagger): <http://127.0.0.1:8000/docs>
- API bajo el prefijo `/api`.

## 5. Probar el panel

1. Abre <http://127.0.0.1:8000/>.
2. **Resumen**: verifica contadores, orden crítico → leve, búsqueda y refresco.
3. **Pacientes**: busca un paciente, abre su historial y descarga el PDF.
4. **Revisar caso**: marca un caso como revisado; debe salir de la cola y mantenerse así al recargar.

> El panel se sirve desde el mismo origen que la API (`MOCK_MODE = false` en `frontend/js/config.js`). No hay CORS configurado, así que si lo abres con Live Server en otro puerto las llamadas fallarán.

### Modo demostración sin backend

En `frontend/js/config.js` cambia `MOCK_MODE` a `true` y sirve la carpeta con un servidor estático:

```powershell
cd frontend
python -m http.server 5500
```

## Credenciales de prueba

El login acepta cualquier email; si el usuario no existe, lo crea automáticamente con rol `admin`. Los usuarios sembrados usan la contraseña `123456` (almacenada sin hash, solo para desarrollo).

| Email | Rol |
|---|---|
| `vet@sanfrancisco.bo` | veterinario |
| `admin@sanfrancisco.bo` | admin |

## Notas de desarrollo

- El `.env` no debería versionarse; usa `.env.example` como plantilla.
- Las contraseñas se guardan en texto plano (pendiente para un sprint futuro).
- Las rutas de pendientes y detalle aún no exigen autenticación real; el token es fijo.
