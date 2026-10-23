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

Las tablas se crean automáticamente al importar `app.main`. Para poblar la base con datos de demostración (idempotente, no duplica si ya existen):

```powershell
.\venv\Scripts\python.exe seed_data.py
```

Genera 12 usuarios, 10 pacientes, 10 triajes (2 críticos, 5 moderados, 3 leves) y 20 vacunas: una aplicada y otra programada, próxima o vencida por paciente. También completa teléfono/dirección de los tutores y peso/alergias de los pacientes.

## 4. Ejecutar el sistema

```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

- Panel veterinario: <http://127.0.0.1:8000/>
- Documentación interactiva (Swagger): <http://127.0.0.1:8000/docs>
- Verificación de salud: <http://127.0.0.1:8000/health>
- API bajo el prefijo `/api`.
- Fotos subidas: <http://127.0.0.1:8000/dataset/nuevas/...>
- Si el panel se abrió antes de un cambio reciente y muestra un error, haz una recarga forzada (`Ctrl+Shift+R`). El backend ya envía `Cache-Control: no-store` para HTML, JS y CSS del panel.

## 5. Probar el panel

1. Abre <http://127.0.0.1:8000/>. Serás redirigido a la pantalla de login.
2. Inicia sesión con `vet@sanfrancisco.bo` / `123456`.
3. **Resumen**: verifica contadores, orden crítico → leve, búsqueda y refresco.
4. **Pacientes**: abre la ficha completa de un paciente. Verás tutor, teléfono, dirección, edad, peso, alergias y las pestañas **Consultas** y **Vacunas**. Desde la pestaña de vacunas puedes programar, aplicar o eliminar refuerzos.
5. **Vacunación**: revisa vencidos, próximos 30 días y programados; busca por paciente o vacuna; programa un refuerzo y regístralo como aplicado.
6. **Revisar caso**: marca un caso como revisado; debe salir de la cola y mantenerse así al recargar.
7. **Sesión**: la barra superior muestra el usuario autenticado y permite cerrar sesión. La ruta actual se conserva en el hash (`#/resumen`, `#/pacientes`, `#/vacunacion`, `#/caso/12`, `#/pacientes/3`).

> El panel se sirve desde el mismo origen que la API (`MOCK_MODE = false` en `frontend/js/config.js`). No hay CORS configurado, así que si lo abres con Live Server en otro puerto las llamadas fallarán.

### Modo demostración sin backend

En `frontend/js/config.js` cambia `MOCK_MODE` a `true` y sirve la carpeta con un servidor estático. El login de demostración acepta cualquier correo y contraseña:

```powershell
cd frontend
python -m http.server 5500
```

## Credenciales de prueba

El login valida el correo y la contraseña contra la base de datos. Los usuarios sembrados usan la contraseña `123456`. Las contraseñas se almacenan con PBKDF2-SHA256 y los usuarios antiguos en texto plano se migran automáticamente en su primer inicio de sesión.

| Email | Rol | Acceso al panel |
|---|---|---|
| `vet@sanfrancisco.bo` | veterinario | Sí |
| `admin@sanfrancisco.bo` | admin | Sí |
| `maria.rojas@example.com` | tutor | No (solo app móvil) |

## Autenticación

- `POST /api/auth/login` devuelve `access_token`, `token_type`, `expires_in` y `usuario`.
- Las rutas de pacientes, historial, triaje, vacunación y PDF requieren `Authorization: Bearer <token>`.
- Solo los roles `veterinario` y `admin` pueden marcar casos como revisados, editar pacientes, actualizar el contacto de un tutor y crear/aplicar/eliminar vacunas.
- El panel guarda el token en `sessionStorage`; al cerrar sesión se descarta. Los tokens son stateless y expiran a los 7 días por defecto.
- `GET /health` (y `GET /api/health`) no requiere token y responde `{ "status": "ok" }`; sirve para verificaciones de disponibilidad.
- Define `SECRET_KEY` y, si lo necesitas, `TOKEN_TTL_SECONDS` en `backend/.env` (ver `.env.example`).

## Notas de desarrollo

- El `.env` no debería versionarse; usa `.env.example` como plantilla.
- El token es stateless: el logout descarta el token en el cliente; no hay lista de revocación.
- La app móvil también debe volver a iniciar sesión si conservaba un token del esquema anterior (`dev-token-san-francisco`).
- Las columnas nuevas de Sprint B se crean con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` en `ensure_schema()` al arrancar; no hace falta ejecutar una migración aparte.
- Las fotos de triaje se guardan en `dataset/nuevas/` con un nombre saneado y se sirven desde `/dataset/...`. El panel normaliza las rutas antiguas `../dataset/...`.
- Los `404` de `/.well-known/appspecific/com.chrome.devtools.json` y `/v1/models` son consultas externas (DevTools y un cliente compatible con OpenAI), no fallos del panel. El primero ya responde `204`.
