# Contrato de API requerido por los frontends

La app móvil y el panel consumen las rutas siguientes. Al comenzar esta implementación, las rutas de autenticación, triaje algorítmico, vacunación, revisión y PDF aún no existían en el backend. Los nombres aquí documentados son los que esperan los frontends.

## Modo de demostración del panel

El panel está dividido en `css/`, `js/` y `assets/`. `js/config.js` contiene `const MOCK_MODE = true;`; mientras esté activo, `js/api.js` retorna datos locales y no realiza solicitudes HTTP. La marca “Modo demostración · datos ficticios” identifica esta modalidad. Marcar un caso como revisado actualiza el estado en memoria y lo quita de la cola hasta recargar la página. La opción de PDF crea un documento PDF local de ejemplo.

Para conectar el backend, cambia `MOCK_MODE` a `false`. Si el panel se sirve desde otro origen, define `window.VET_API_BASE_URL` antes de cargar el módulo de la vista. Para probar la demo sin ejecutar FastAPI, abre `frontend/index.html` con VS Code Live Server o inicia un servidor estático desde `frontend/` (por ejemplo, `python -m http.server 5500`).

## App móvil

- `POST /api/auth/login` recibe JSON `{ "email": "...", "password": "..." }`. Responde `{ "access_token": "...", "usuario": { "id": 12 } }` (también se acepta `user` o `tutor_id`).
- `GET /api/pacientes/?tutor_id=12&skip=0&limit=200` requiere bearer token y devuelve una lista con `id`, `tutor_id`, `nombre`, `especie`, `raza` y `sexo`.
- `POST /api/historial/triaje` recibe JSON cuando no hay foto: `{ "paciente_id": 3, "respuestas": { ... }, "motivo": "..." }`. Con foto, recibe multipart con esos campos y `foto` como archivo; `respuestas` es un JSON serializado. La respuesta debe incluir `puntaje_riesgo` y `nivel_gravedad` (`leve`, `moderada` o `critica`).
- `GET /api/vacunacion/paciente/3` devuelve una lista (o `{ "items": [...] }`) con `fecha_programada` y `nombre_vacuna` por refuerzo.

## Panel veterinario

- `GET /api/historial/pendientes` devuelve casos con `id`, `paciente_id`, `paciente_nombre`, `especie`, `tutor_nombre`, `motivo`, `respuestas`, `puntaje_riesgo`, `nivel_gravedad`, `fecha_consulta` y opcionalmente `fotos` / `foto_url`. El panel ordena crítica, moderada y leve, y luego por puntaje descendente.
- `PATCH /api/historial/{id}/revisar` recibe `{ "estado": "revisado", "notas_veterinario": "..." }`.
- `GET /api/historial/paciente/{paciente_id}/pdf` responde el PDF del historial clínico con `Content-Type: application/pdf`.

Las rutas de pendientes y detalle deben protegerse con autenticación/autorización de veterinario. La app móvil adjunta el JWT como `Authorization: Bearer ...` en las rutas autenticadas.
