# ProyectSystem3Veterinaria_Asis

Sistema de triaje veterinario con panel web, API y app móvil.
Consulta el [contexto del sistema y del triaje](Context.md).

- `backend/`: API REST con FastAPI + SQLAlchemy + PostgreSQL. También sirve el panel web.
- `frontend/`: panel veterinario (HTML/CSS/JS, sin build).
- `app_movil/`: aplicación Flutter para tutores.

## Ejecutar con Docker Compose

**Requisitos**. Docker Desktop activo con contenedores Linux y Docker Compose. Ejecuta los comandos de esta sección desde la raíz del repositorio, donde está `compose.yaml`.

### 1. Configurar el entorno local

Si ya tienes un `.env` en la raíz con `VET_SECRET_KEY` y `VET_OBJECT_KEY`, conserva sus valores. Si empiezas desde un clon nuevo, genera las claves una sola vez:

```powershell
if (-not (Test-Path .env)) {
    $firma = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
    $objetos = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
    @("VET_SECRET_KEY=$firma", "VET_OBJECT_KEY=$objetos") | Set-Content .env -Encoding ascii
}
```

Si creaste el archivo a partir de [`.env.example`](.env.example), rellena las dos claves de Compose con valores distintos. Git ignora el `.env` y Docker lo excluye de la imagen.

### 2. Levantar el sistema y cargar la demo

```powershell
docker compose up --build --wait
docker compose ps
```

El comando levanta FastAPI con el panel web, PostgreSQL y SeaweedFS. Para cargar pacientes, tutores y casos ficticios en la base local, ejecuta:

```powershell
docker compose exec app python seed_data.py
```

- [Panel veterinario](http://127.0.0.1:8000/). Inicia sesión con `vet@sanfrancisco.bo` y la contraseña de prueba `123456`.
- [Estado del servicio](http://127.0.0.1:8000/ready). Comprueba que el backend puede consultar PostgreSQL y el bucket.
- [Documentación de la API](http://127.0.0.1:8000/docs). Los endpoints de la aplicación usan el prefijo `/api`.

Si el puerto 8000 está ocupado, ejecuta `$env:VET_HTTP_PORT = '8002'` antes de iniciar Compose y usa ese puerto en las direcciones de arriba.

### 3. Probar el triaje desde Android por USB

Desde la raíz, con el teléfono conectado y la depuración USB habilitada:

```powershell
adb reverse tcp:8000 tcp:8000
Set-Location app_movil
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:8000
```

Si cambiaste el puerto en Compose, ajusta el segundo puerto de `adb reverse` y conserva el primero y la URL de Flutter. Por ejemplo, con el puerto 8002 del equipo ejecuta `adb reverse tcp:8000 tcp:8002`.

Inicia sesión con `maria.rojas@example.com` y `123456`, selecciona una mascota y envía un reporte. En el panel, abre **Triaje / Cola**, revisa el caso y guarda las observaciones. La [guía móvil](app_movil/README.md) incluye otros destinos de prueba.

### Detener el entorno

Desde la raíz, ejecuta `docker compose down`. Los volúmenes `postgres_datos`, `objetos_datos` y `triaje_fotos` conservan los registros y las fotos.

## Variables para Render y Supabase

En Render, abre **Environment** en el servicio web y configura estas
variables con los valores del entorno publicado:

- `DATABASE_URL`. Cadena PostgreSQL del Session pooler de Supabase.
  Usa el prefijo `postgresql+psycopg2://` y conexión TLS (`sslmode=require`).
- `SECRET_KEY`. Clave de firma nueva y exclusiva de Render.
- `S3_BUCKET`. Nombre del bucket privado, por ejemplo `triaje-fotos`.
- `S3_ENDPOINT_URL` y `AWS_DEFAULT_REGION`. Endpoint y región que muestra
  Supabase en la configuración S3.
- `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`. Par S3 de Supabase, de uso
  exclusivo del backend.

`VET_SECRET_KEY` y `VET_OBJECT_KEY` pertenecen a Compose. Flutter recibe
la URL pública HTTPS en `API_BASE_URL`. Kubernetes inyecta su configuración
mediante los Secrets del clúster.

## Kubernetes local

Consulta [el despliegue con kind](deploy/k8s/README.md).

## Probar el panel

1. Abre <http://127.0.0.1:8000/>. Serás redirigido a la pantalla de login.
2. Inicia sesión con `vet@sanfrancisco.bo` / `123456`.
3. **Resumen**: verifica contadores, orden crítico → leve, búsqueda y refresco.
4. **Pacientes**: abre la ficha completa de un paciente. Verás tutor, teléfono, dirección, edad, peso, alergias y las pestañas **Consultas** y **Vacunas**. Desde la pestaña de vacunas puedes programar, aplicar o eliminar refuerzos.
5. **Vacunación**: revisa vencidos, próximos 30 días y programados; busca por paciente o vacuna; programa un refuerzo y regístralo como aplicado.
6. **Revisar caso**: marca un caso como revisado; debe salir de la cola y mantenerse así al recargar.
7. **Sesión**: la barra superior muestra el usuario autenticado y permite cerrar sesión. La ruta actual se conserva en el hash (`#/resumen`, `#/pacientes`, `#/vacunacion`, `#/caso/12`, `#/pacientes/3`).

> El panel se sirve desde el mismo origen que la API (`MOCK_MODE = false` en `frontend/js/config.js`). El modo con API usa el panel servido por FastAPI.

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
- `GET /health` (y `GET /api/health`) verifica que responde la API. `GET /ready` verifica la conexión con PostgreSQL y el bucket, si está configurado.

## Notas de desarrollo

- Si reutilizas una base con credenciales anteriormente versionadas, rota su contraseña en el servidor correspondiente.
- El token es stateless: el logout descarta el token en el cliente; no hay lista de revocación.
- La app móvil también debe volver a iniciar sesión si conservaba un token del esquema anterior (`dev-token-san-francisco`).
- Las columnas nuevas de Sprint B se crean con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` en `ensure_schema()` al arrancar; no hace falta ejecutar una migración aparte.
- El panel solicita las fotos de triaje a `/api/historial/{id}/foto` con sesión. En Compose, las nuevas se guardan en el bucket privado. La API puede leer fotos antiguas si sus archivos siguen en `dataset/nuevas/` en el entorno que contiene ese historial.
- Los `404` de `/.well-known/appspecific/com.chrome.devtools.json` y `/v1/models` son consultas externas (DevTools y un cliente compatible con OpenAI), no fallos del panel. El primero ya responde `204`.
