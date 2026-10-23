# Cambios implementados — Sprints A y B

**Fecha:** 22 de octubre de 2026  
**Rama:** `Rod/Ajustes_backend`  
**Alcance Sprint A:** autenticación real, sesión del panel, logout, utilidades compartidas y router por hash.  
**Alcance Sprint B:** ficha completa del paciente, módulo de vacunación, CRUD de refuerzos, fotos servidas desde `/dataset` y verificación `/health`.

---

## 1. Objetivo del Sprint A

Cerrar el acceso al panel veterinario con un login funcional y dejar una base ordenada para los siguientes módulos:

- Validar credenciales contra la base de datos.
- Emitir y validar tokens de sesión.
- Proteger las rutas de la API.
- Guardar la sesión en el panel y enviar `Authorization: Bearer`.
- Cerrar sesión y redirigir cuando el token expire.
- Compartir utilidades entre vistas y conservar la ruta actual en la URL.

---

## 2. Backend

### 2.1 Nuevo módulo `app/utils/security.py`

Implementado con la librería estándar, sin agregar dependencias:

- `hash_password()`: PBKDF2-SHA256 con sal aleatoria.
- `verify_password()`: valida hashes y mantiene compatibilidad con contraseñas antiguas en texto plano.
- `is_password_hashed()`: detecta el formato `pbkdf2_sha256$...`.
- `create_access_token()`: token firmado con HMAC-SHA256, formato JWT-like, con `sub`, `rol`, `nombre`, `iat` y `exp`.
- `decode_access_token()`: verifica firma, algoritmo y expiración.

Variables de entorno nuevas (con valores por defecto para desarrollo):

- `SECRET_KEY`
- `TOKEN_TTL_SECONDS` (por defecto `604800`, 7 días)

### 2.2 Login real

`POST /api/auth/login` ahora:

- Busca el usuario por email sin distinguir mayúsculas.
- Valida la contraseña con `verify_password()`.
- Devuelve `401` con “Correo o contraseña incorrectos” si falla.
- Migra automáticamente contraseñas antiguas en texto plano a PBKDF2 en el primer login exitoso.
- Responde con `access_token`, `token_type`, `expires_in` y `usuario` (`id`, `nombre`, `email`, `rol`).
- Ya no crea usuarios automáticamente para correos desconocidos.

### 2.3 Rutas nuevas

- `GET /api/auth/me`: devuelve el usuario autenticado.
- `POST /api/auth/logout`: confirma el cierre de sesión (el token se descarta en el cliente).

### 2.4 Protección de rutas

Se agregó la dependencia `get_current_user()` basada en `HTTPBearer` y `require_roles()`:

- Requieren token: pacientes (GET/POST), triaje, pendientes, historial, PDF y vacunación.
- Solo `veterinario` y `admin` pueden marcar un caso como revisado.
- Solo `admin` puede listar o crear usuarios.
- Al revisar un caso se guarda el `veterinario_id` del usuario autenticado.

### 2.5 Seed y CRUD de usuarios

- `seed_data.py` crea las contraseñas con `hash_password()`.
- `crud_usuario.crear_usuario()` ya no guarda contraseñas en texto plano.

### 2.6 Página de login servida por FastAPI

- `GET /login` y `GET /login.html` devuelven `frontend/login.html`.

### 2.7 Esquema de respuesta

`LoginResponse` ahora incluye `token_type` y `expires_in`.

---

## 3. Frontend

### 3.1 Pantalla de login (`login.html` + `js/login.js` + `css/login.css`)

- Formulario con correo y contraseña.
- Validación básica en cliente.
- Botón para mostrar/ocultar contraseña.
- Mensajes de error accesibles (`role="alert"`).
- Estado de carga mientras se verifica.
- Aviso cuando la sesión expiró (`login.html?expired=1`).
- Rechaza cuentas con rol `tutor`: solo `veterinario` y `admin` entran al panel.
- En `MOCK_MODE=true` permite una sesión de demostración sin backend.
- Credenciales de prueba visibles en la pantalla.

### 3.2 Sesión (`js/session.js`)

- Guarda `access_token` y `usuario` en `sessionStorage` bajo la clave `vet.session`.
- `authHeaders()` construye `Authorization: Bearer <token>`.
- `isSessionValid()` revisa la expiración del token.
- `requireSession()` redirige a `login.html` si no hay sesión válida.
- `logout()` limpia la sesión y redirige al login.

### 3.3 Cliente API (`js/api.js`)

- Todas las peticiones JSON envían el token automáticamente.
- La descarga de PDF también envía el token.
- Si la API responde `401`, se limpia la sesión y se redirige a `login.html?expired=1`.

### 3.4 Router por hash (`js/router.js` + `js/app.js`)

Rutas soportadas:

- `#/resumen`
- `#/pacientes`
- `#/pacientes/{id}` (abre el historial del paciente)
- `#/caso/{id}` (abre el detalle del caso)

Comportamiento:

- La vista se conserva al recargar.
- Los enlaces directos a un caso o paciente funcionan.
- Al cerrar el modal, la URL vuelve a la vista base.
- La navegación del menú actualiza el hash y el estado activo.

### 3.5 Utilidades compartidas (`js/utils.js`)

Se centralizaron funciones que antes estaban duplicadas:

- `escapeHtml`, `formatDate`, `initials`, `score`.
- `severityOf`, `severityLabel`, `severityClass`.
- `toast`, `triggerDownload`.
- `openDetail`, `closeDetail`.
- Selectores `$` y `$$`.

### 3.6 Cambios en las vistas

- `js/views/resumen.js` ahora exporta `initResumen()`, `refreshDashboard()` y `openCaseById()`.
- `js/views/pacientes.js` ahora exporta `initPacientes()`, `loadPatients()` y `openPatientById()`.
- Se eliminó el arranque automático desde `resumen.js`; el punto de entrada es `js/app.js`.
- Se agregaron botones de reintento en los estados de error de casos, pacientes e historial.
- El historial muestra la gravedad con etiqueta legible y la fecha con hora.
- Se corrigió el mensaje del PDF: ya no dice “de demostración” cuando `MOCK_MODE=false`.

### 3.7 Interfaz del panel (`index.html`)

- Guardia de sesión en el `<head>` para evitar mostrar el panel antes de redirigir.
- Nombre, rol e iniciales del usuario autenticado en la barra lateral y en la barra superior.
- Botón “Cerrar sesión” en la barra lateral y en la barra superior (visible en móvil).
- Tipografías `DM Sans` y `Manrope` cargadas desde Google Fonts.
- Favicon propio en `assets/favicon.svg`.
- Se corrigió el `data-view` de “Resumen” (`inicio` → `resumen`) para que el estado activo funcione con el router.

---

## 4. Archivos agregados

- `backend/app/utils/security.py`
- `frontend/login.html`
- `frontend/js/login.js`
- `frontend/js/session.js`
- `frontend/js/router.js`
- `frontend/js/utils.js`
- `frontend/js/app.js`
- `frontend/css/login.css`
- `frontend/assets/favicon.svg`
- `cambios.md`

## 5. Archivos modificados

- `backend/.env.example`
- `backend/app/api/routes.py`
- `backend/app/crud/crud_historial.py`
- `backend/app/crud/crud_usuario.py`
- `backend/app/schemas/schemas.py`
- `backend/main.py`
- `backend/seed_data.py`
- `frontend/index.html`
- `frontend/css/components.css`
- `frontend/js/api.js`
- `frontend/js/views/resumen.js`
- `frontend/js/views/pacientes.js`
- `frontend/FRONTEND_API_CONTRACT.md`
- `README.md`

---

## 6. Cómo probar

1. Ejecutar el backend:

   ```powershell
   cd backend
   .\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
   ```

2. Abrir <http://127.0.0.1:8000/> y verificar la redirección al login.

3. Iniciar sesión con `vet@sanfrancisco.bo` / `123456`.

4. Verificar:

   - Nombre y rol del usuario en la barra lateral.
   - Cola de triaje con contadores.
   - Navegación a Pacientes.
   - Apertura de un paciente y su historial.
   - Hash `#/pacientes/{id}` y `#/caso/{id}`.
   - Cierre de sesión y redirección al login.
   - Acceso directo a `/` sin sesión: debe redirigir al login.
   - Contraseña incorrecta: mensaje de error, sin crear sesión.

5. Probar el modo demo (opcional):

   - Cambiar `MOCK_MODE` a `true` en `frontend/js/config.js`.
   - Servir `frontend/` con un servidor estático.
   - El login acepta cualquier correo/contraseña y crea una sesión local.

---

## 7. Verificación realizada

- Compilación de los módulos Python modificados con `py_compile`.
- Prueba directa de hash, verificación y tokens (válido, manipulado y expirado).
- Importación de la app FastAPI y listado de rutas.
- Prueba HTTP real con Uvicorn:
  - `GET /login` → 200.
  - `GET /` → 200.
  - `POST /api/auth/login` → 200 con token.
  - `GET /api/auth/me` → 200.
  - `GET /api/historial/pendientes` con token → 200.
  - `GET /api/historial/pendientes` sin token → 401.
  - Revisar con rol `tutor` → 403.
  - Revisar con rol `veterinario` y caso inexistente → 404.
  - Listar usuarios con rol `veterinario` → 403; con `admin` → 200.
- Prueba de flujo completo en Chrome headless con Playwright:
  - Redirección al login sin sesión.
  - Login correcto y carga de casos/pacientes.
  - Navegación, deep links, cierre de modales y router.
  - Logout, limpieza de sesión y nueva redirección al login.
  - Mensaje de error con contraseña incorrecta.

> Nota: durante la prueba de login, el usuario `vet@sanfrancisco.bo` de la base local se migró de contraseña en texto plano a hash PBKDF2.

---

## 8. Limitaciones conocidas

- El logout es del lado del cliente: el token sigue siendo válido hasta su expiración porque no hay lista de revocación.
- La sesión se guarda en `sessionStorage`, por lo que se pierde al cerrar la pestaña.
- No hay refresh tokens ni renovación automática.
- La app móvil debe volver a iniciar sesión si conservaba el token anterior `dev-token-san-francisco`.
- Todavía no se valida la propiedad del paciente por tutor en las rutas (un tutor autenticado puede consultar el listado general).
- Las fotos de triaje ya se guardan con una URL pública `/dataset/nuevas/...`; el panel también normaliza las rutas antiguas `../dataset/...` para no romper registros previos.

---

## 9. Sprint B — Ficha de paciente y vacunación

### 9.1 Objetivo

Completar la ficha clínica del paciente y dar al panel un módulo operativo de vacunación:

- Ver datos del tutor, edad, peso, alergias y foto del paciente.
- Consultar el historial y las vacunas desde una misma ficha con pestañas.
- Detectar refuerzos vencidos, próximos (≤ 30 días) y programados.
- Programar, aplicar y eliminar refuerzos.
- Servir las fotos subidas por la app móvil.

### 9.2 Base de datos y modelos

Se agregaron columnas sin introducir Alembic:

- `usuarios.telefono`, `usuarios.direccion`.
- `pacientes.peso_kg`, `pacientes.alergias`, `pacientes.foto_url`.
- `vacunaciones.estado`, `vacunaciones.fecha_aplicada`, `vacunaciones.lote`, `vacunaciones.notas`.

`app/db/database.py` incluye `ensure_schema()`, que ejecuta `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` al arrancar y desde `seed_data.py`. Así una base ya existente se actualiza sin borrar datos.

### 9.3 Endpoints nuevos o ampliados

- `GET /api/pacientes/{id}`: ficha completa con `tutor` y `edad` calculada (`anios`, `meses`, `texto`).
- `PATCH /api/pacientes/{id}`: actualiza peso, alergias, foto y demás datos clínicos.
- `PATCH /api/usuarios/{id}`: actualiza teléfono y dirección del tutor.
- `GET /api/vacunacion/alertas`: refuerzos pendientes de todos los pacientes, con paciente, especie, tutor y teléfono.
- `GET /api/vacunacion/paciente/{id}`: vacunas del paciente con estado visual y días restantes.
- `POST /api/vacunacion/`: programa un refuerzo.
- `PATCH /api/vacunacion/{id}`: actualiza estado, fecha aplicada, lote o notas.
- `DELETE /api/vacunacion/{id}`: elimina un refuerzo.

Reglas de estado:

- `aplicada`: tiene `estado = aplicada` o `fecha_aplicada`.
- `cancelada`: tiene `estado = cancelada`.
- `vencida`: sigue pendiente y la fecha programada ya pasó.
- `proxima`: faltan 30 días o menos.
- `programada`: faltan más de 30 días.

Las escrituras de pacientes, tutores y vacunas requieren rol `veterinario` o `admin`. Las lecturas requieren sesión válida.

### 9.4 Fotos y verificación de salud

- `GET /health` y `GET /api/health` responden `{ "status": "ok", "service": "veterinaria-api" }` sin token.
- `/dataset` se monta como estático. Las fotos nuevas se guardan en `dataset/nuevas/` con un nombre saneado y se devuelven como `/dataset/nuevas/...`.
- El panel usa `resolvePhotoUrl()` para aceptar tanto `/dataset/...` como las rutas antiguas `../dataset/...`.

### 9.5 Seed de demostración

`seed_data.py` ahora:

- Agrega teléfono y dirección a los 10 tutores.
- Agrega peso y alergias a los 10 pacientes.
- Crea dos vacunas por paciente: una aplicada histórica y otra programada, próxima o vencida.
- Total resultante: 20 vacunas y alertas variadas para probar los estados.

### 9.6 Frontend

- `#/vacunacion` agregado al router y al menú lateral.
- Nueva vista `views/vacunacion.js` con contadores, búsqueda, tabla de refuerzos y acciones.
- `views/pacientes.js` ahora abre una ficha completa:
  - Cabecera con foto/iniciales, especie, raza, sexo, edad, peso y tutor.
  - Tarjetas de tutor, alergias y fechas.
  - Pestañas **Consultas** y **Vacunas** con contadores.
  - Programación, aplicación y eliminación de refuerzos sin cerrar la ficha.
- `vaccine-actions.js` centraliza los diálogos de aplicar y programar, reutilizados por la vista global y la ficha.
- `api.js` incorpora `getPatientDetail`, `getPatientVaccinations`, `getVaccinationAlerts`, `createVaccination`, `updateVaccination` y `deleteVaccination`, además de datos mock.
- `utils.js` incorpora `vaccineStatusLabel`, `vaccineStatusClass`, `ageFromBirthDate` y `resolvePhotoUrl`.
- `components.css` agrega estilos de ficha, pestañas, estados de vacuna, formularios y acciones de fila.
- `index.html` incluye el ítem **Vacunación** y la vista completa del calendario.

### 9.7 Archivos agregados

- `frontend/js/views/vacunacion.js`
- `frontend/js/vaccine-actions.js`

### 9.8 Archivos modificados en Sprint B

- `backend/app/api/routes.py`
- `backend/app/crud/crud_paciente.py`
- `backend/app/crud/crud_usuario.py`
- `backend/app/crud/crud_vacunacion.py`
- `backend/app/db/database.py`
- `backend/app/models/models.py`
- `backend/app/schemas/schemas.py`
- `backend/main.py`
- `backend/seed_data.py`
- `frontend/index.html`
- `frontend/css/components.css`
- `frontend/js/api.js`
- `frontend/js/app.js`
- `frontend/js/config.js`
- `frontend/js/router.js`
- `frontend/js/utils.js`
- `frontend/js/views/pacientes.js`
- `frontend/js/views/resumen.js`
- `frontend/FRONTEND_API_CONTRACT.md`
- `README.md`
- `cambios.md`

### 9.9 Verificación realizada

- `py_compile` de todos los módulos Python modificados.
- `seed_data.py` ejecutado sobre la base local: 20 vacunas y datos de tutor/paciente completados.
- Pruebas HTTP reales con Uvicorn:
  - `GET /health` → `200`.
  - `GET /api/pacientes/1` con token → ficha con tutor, edad, peso y alergias.
  - `GET /api/vacunacion/alertas` → 10 alertas: 3 vencidas, 3 próximas y 4 programadas.
  - Crear, aplicar y eliminar una vacuna → `200`.
  - Actualizar contacto del tutor y ficha del paciente → `200`.
  - `GET /dataset/nuevas/...` → `200`.
  - `GET /api/pacientes/1` sin token → `401`.
  - Subida multipart real de una foto → archivo guardado y servido desde `/dataset/nuevas/...`.
- Prueba de flujo completo en Chrome headless con Playwright:
  - Login, navegación a Vacunación y carga de alertas.
  - Programar un refuerzo, aplicarlo y comprobar que desaparece de pendientes.
  - Abrir `#/pacientes/1`, verificar tutor/teléfono/edad y pestaña de vacunas.
  - Eliminar la vacuna aplicada desde la ficha.
  - Programar un refuerzo desde la ficha sin cerrar el diálogo y eliminarlo.
  - Cerrar la ficha y volver a `#/pacientes`.

### 9.10 Sobre el mensaje `GET /health HTTP/1.1" 404 Not Found`

Ese mensaje no lo generaba el panel ni una sesión expirada: provenía de un cliente o verificador de salud externo que consultaba `/health`. Esa ruta no existía en el repositorio, por lo que FastAPI respondía `404`. Se agregó `GET /health` (y `GET /api/health`) y ahora responde `200` con `{ "status": "ok" }`. El aviso deja de aparecer mientras el cliente siga consultando esa ruta.

### 9.11 Otros mensajes esperables en la terminal

- `GET /.well-known/appspecific/com.chrome.devtools.json`: lo solicita Chrome DevTools al inspeccionar la página. Se agregó una ruta que responde `204` para evitar el `404`.
- `GET /undefined`: normalmente lo genera una pestaña con una versión antigua del panel, una extensión del navegador o DevTools buscando un recurso inexistente. El frontend ahora rechaza valores literales `undefined`, `null` o `none` en `foto_url`, así que una recarga forzada (`Ctrl+Shift+R`) debe eliminarlo. Si persiste, conviene revisar la pestaña **Network** de DevTools para ver qué recurso lo origina.
- `GET /v1/models`: no pertenece a esta API. Lo consulta un cliente externo que espera una API compatible con OpenAI. El `404` es correcto; no afecta al panel ni a la app móvil.

### 9.12 Sobre `No se pudo cargar el calendario: Not Found`

El backend sí tiene registrada `GET /api/vacunacion/alertas` (sin token responde `401`, con token `200`). El `404` aparecía cuando el navegador conservaba en caché un `config.js` anterior a Sprint B: ese archivo no incluía `vaccinationAlerts`, por lo que `requestJson(undefined)` terminaba solicitando `/undefined` y FastAPI devolvía `Not Found`.

Se corrigió en dos frentes:

- `frontend/js/api.js` ahora combina las rutas con valores por defecto. Si el navegador carga un `config.js` antiguo, las rutas nuevas siguen funcionando y `requestJson()` rechaza una ruta vacía con un mensaje claro en lugar de pedir `/undefined`.
- `backend/main.py` envía `Cache-Control: no-store` para HTML, JS y CSS del panel, de modo que los cambios futuros no queden atrapados en caché.

Después de actualizar, hacer una recarga forzada una vez (`Ctrl+Shift+R`) o cerrar y abrir la pestaña del panel.

### 9.13 Siguientes pasos sugeridos

- Validar que un tutor solo pueda consultar sus propios pacientes.
- Agregar revocación de tokens o refresh tokens.
- Añadir recordatorios automáticos de vacunación por correo o notificación móvil.
- Incorporar auditoría de quién aplicó o eliminó cada vacuna.
