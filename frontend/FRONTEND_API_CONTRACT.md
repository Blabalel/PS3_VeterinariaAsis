# Contrato de API requerido por los frontends

La app móvil y el panel consumen las rutas siguientes. Las rutas de autenticación, triaje algorítmico, vacunación, revisión y PDF ya están implementadas en el backend. Los nombres aquí documentados son los que esperan los frontends.

## Modo de demostración del panel

El panel está dividido en `css/`, `js/` y `assets/`. `js/config.js` contiene `MOCK_MODE` (por defecto `false`); mientras esté activo, `js/api.js` retorna datos locales y no realiza solicitudes HTTP de datos. El login de demostración acepta cualquier correo y contraseña, y crea una sesión local con rol `admin`. La marca “Modo demostración · datos ficticios” identifica esta modalidad. Marcar un caso como revisado actualiza el estado en memoria y lo quita de la cola hasta recargar la página. La opción de PDF crea un documento PDF local de ejemplo.

Para conectar el backend, mantén `MOCK_MODE` en `false`. Si el panel se sirve desde otro origen, define `window.VET_API_BASE_URL` antes de cargar el módulo de la vista. Para probar la demo sin ejecutar FastAPI, abre `frontend/index.html` con VS Code Live Server o inicia un servidor estático desde `frontend/` (por ejemplo, `python -m http.server 5500`).

## App móvil

- `POST /api/auth/login` recibe JSON `{ "email": "...", "password": "..." }`. Responde `{ "access_token": "...", "usuario": { "id": 12 } }` (también se acepta `user` o `tutor_id`).
- `GET /api/pacientes/?tutor_id=12&skip=0&limit=200` requiere bearer token y devuelve una lista con `id`, `tutor_id`, `nombre`, `especie`, `raza` y `sexo`.
- `POST /api/historial/triaje` recibe JSON cuando no hay foto: `{ "paciente_id": 3, "respuestas": { ... }, "motivo": "..." }`. Con foto, recibe multipart con esos campos y `foto` como archivo; `respuestas` es un JSON serializado. La respuesta debe incluir `puntaje_riesgo` y `nivel_gravedad` (`leve`, `moderada` o `critica`).
- `GET /api/vacunacion/paciente/3` devuelve una lista (o `{ "items": [...] }`) con `fecha_programada`, `nombre_vacuna`, `estado`, `estado_visual` (`aplicada`, `vencida`, `proxima`, `programada`, `cancelada`), `fecha_aplicada`, `lote`, `notas` y `dias_restantes` por refuerzo.

## Panel veterinario

Todas las rutas del panel requieren `Authorization: Bearer <access_token>`. El token se obtiene en `POST /api/auth/login` y se guarda en `sessionStorage` (`vet.session`). Si la API responde `401`, el panel descarta la sesión y redirige a `login.html?expired=1`.

- `POST /api/auth/login` valida `{ "email": "...", "password": "..." }` y responde `{ "access_token": "...", "token_type": "bearer", "expires_in": 604800, "usuario": { "id": 2, "nombre": "...", "email": "...", "rol": "veterinario" } }`. Solo los roles `veterinario` y `admin` pueden entrar al panel.
- `GET /api/auth/me` devuelve el usuario autenticado.
- `POST /api/auth/logout` confirma el cierre de sesión; el token se descarta en el cliente.
- `GET /api/historial/pendientes` devuelve casos con `id`, `paciente_id`, `paciente_nombre`, `especie`, `tutor_nombre`, `motivo`, `respuestas`, `puntaje_riesgo`, `nivel_gravedad`, `fecha_consulta` y opcionalmente `fotos` / `foto_url`. El panel ordena crítica, moderada y leve, y luego por puntaje descendente.
- `PATCH /api/historial/{id}/revisar` recibe `{ "estado": "revisado", "notas_veterinario": "..." }`. Requiere rol `veterinario` o `admin` y registra el `veterinario_id` que revisó.
- `GET /api/historial/paciente/{paciente_id}/pdf` responde el PDF del historial clínico con `Content-Type: application/pdf`.
- `GET /api/pacientes/{id}` devuelve la ficha completa: datos del paciente (`peso_kg`, `alergias`, `foto_url`), `tutor` (`nombre`, `email`, `telefono`, `direccion`) y `edad` calculada (`anios`, `meses`, `texto`).
- `PATCH /api/pacientes/{id}` actualiza la ficha del paciente. Requiere rol `veterinario` o `admin`.
- `PATCH /api/usuarios/{id}` actualiza `telefono` y `direccion` del tutor. Requiere rol `veterinario` o `admin`.
- `GET /api/vacunacion/alertas` devuelve los refuerzos pendientes de todos los pacientes, con los datos del paciente y del tutor. No incluye vacunas aplicadas ni canceladas.
- `POST /api/vacunacion/` crea un refuerzo con `{ "paciente_id": 1, "nombre_vacuna": "Rabia", "fecha_programada": "2026-11-15T12:00:00Z", "notas": "..." }`.
- `PATCH /api/vacunacion/{id}` actualiza estado, fecha de aplicación, lote o notas. Si `estado` es `aplicada` y no se envía `fecha_aplicada`, el backend usa la fecha actual.
- `DELETE /api/vacunacion/{id}` elimina un refuerzo. Las tres operaciones de escritura requieren rol `veterinario` o `admin`.
- `GET /health` y `GET /api/health` son públicos y responden `{ "status": "ok", "service": "veterinaria-api" }`.
- `GET /dataset/nuevas/{archivo}` sirve las fotos de triaje subidas. El backend devuelve esa URL en `foto_url` y el panel también acepta rutas antiguas `../dataset/...`.

La app móvil adjunta el token como `Authorization: Bearer ...` en pacientes, triaje y vacunación. El login es público y es el único endpoint de datos que no requiere token; `/health` también es público.
