# Sistema de triaje veterinario San Francisco de Asís

El sistema permite que un tutor reporte desde el celular cómo se encuentra su mascota. La app recoge un cuestionario y, opcionalmente, una fotografía. FastAPI calcula una prioridad preliminar y registra el caso. El equipo veterinario usa el panel web para ordenar la atención, revisar el caso y guardar sus observaciones en el historial clínico. El mismo panel permite gestionar pacientes y vacunas y descargar historiales en PDF. [Contexto previo](Context.md) · [Contrato de API](frontend/FRONTEND_API_CONTRACT.md) · [Pantallas del móvil](app_movil/lib/features)

El repositorio contiene una app Flutter y una aplicación web monolítica donde FastAPI sirve tanto la API REST como los archivos del panel. PostgreSQL guarda los datos clínicos y el almacén compatible con S3 guarda los archivos fotográficos. Docker Compose reproduce el entorno local y kind permite probar dos réplicas de la API. La rama examinada incorpora cambios para conectar con Supabase. La publicación en Render y la validación desde un Android en otra red aún carecen de evidencia local. [Dockerfile](Dockerfile) · [Compose](compose.yaml) · [Manifiestos locales](deploy/k8s) · Commit `893fda8`.

## Objetivo y alcance

- **Problema que resuelve.** Centralizar el envío y la revisión de reportes veterinarios, ordenar la cola según las respuestas del tutor y conservar el historial de consultas y vacunación. [Panel](frontend/index.html) · [Motor de triaje](backend/app/services/triaje_service.py) · [Modelos](backend/app/models/models.py).
- **Usuarios.** Tutores de mascotas en el móvil y personal veterinario o administrativo en el panel. Las rutas de datos aplican permisos de sesión, rol y, cuando corresponde, propiedad de la mascota. [Guía móvil](app_movil/README.md) · [Dependencias de API](backend/app/api/deps.py).
- **Límites del producto observado.** La clasificación orienta la revisión humana. El motor usa el cuestionario y la foto sirve como evidencia visual. La telemedicina consiste en revisión asíncrona de reportes y los recordatorios de vacunación se muestran en un calendario. No se encontró implementación de diagnóstico automatizado por imágenes, videollamada ni notificaciones push. [Motor de triaje](backend/app/services/triaje_service.py) · [Telemedicina](frontend/js/views/telemedicina.js) · [Calendario](frontend/UX_IMPLEMENTACION.md) · [Dependencias Flutter](app_movil/pubspec.yaml).
- **Alcance académico.** Como referencia externa, la consigna «Proyecto Integrador - 6to semestre», compartida previamente, prevé una aplicación web, una móvil y un aporte de tecnología emergente. Para Cloud Computing, el Anexo A pide justificar la selección, diseñar la arquitectura, demostrar una implementación operativa y aportar evidencia de disponibilidad o escalabilidad y evaluación. El despliegue local documenta recuperación de un pod. La prueba equivalente del servicio publicado todavía requiere evidencia. [Prueba Kubernetes local](deploy/k8s/README.md#evidencia-de-la-prueba-local) · [Configuración prevista para publicación](README.md#variables-para-render-y-supabase).

## Stack tecnológico

Los rangos indican dependencias declaradas y los tags identifican imágenes. La versión exacta instalada puede variar cuando el repositorio declara un rango.

| Capa | Tecnología | Versión detectada | Evidencia |
| --- | --- | --- | --- |
| Frontend web | HTML, CSS y JavaScript con módulos ES | Sin versión declarada | [index.html](frontend/index.html), [main.js](frontend/js/main.js), [UX](frontend/UX_IMPLEMENTACION.md) |
| Frontend web | FullCalendar Standard y localización en español | 6.1.19 | [index.html](frontend/index.html), [licencia](frontend/vendor/FULLCALENDAR-LICENSE.md) |
| App móvil | Dart y Flutter | Dart `>=3.11.0 <4.0.0`; Flutter `>=3.41.0` según el lockfile; app `1.0.0+1` | [pubspec.yaml](app_movil/pubspec.yaml), [pubspec.lock](app_movil/pubspec.lock) |
| App móvil | HTTP, image_picker, flutter_secure_storage, table_calendar, intl | `^1.6.0`, `^1.2.3`, `^9.2.4`, `^3.2.0`, `^0.20.2`, respectivamente | [pubspec.yaml](app_movil/pubspec.yaml) |
| Build Android | Gradle, Android Gradle Plugin, Kotlin y configuración JVM | Gradle 9.3.1, AGP 9.1.0, Kotlin 2.4.0 y target JVM 17 | [Wrapper](app_movil/android/gradle/wrapper/gradle-wrapper.properties), [plugins](app_movil/android/settings.gradle.kts), [build](app_movil/android/app/build.gradle.kts) |
| Backend | Python, FastAPI y Uvicorn | Python 3.12 en Docker; FastAPI `>=0.115,<1.0`; Uvicorn `>=0.30,<1.0` | [Dockerfile](Dockerfile), [requirements.txt](backend/requirements.txt) |
| Backend | Validación y entorno con Pydantic Settings, python-dotenv y python-multipart | `>=2.0,<3.0`, `>=1.0,<2.0`, `>=0.0.9,<1.0`, respectivamente | [requirements.txt](backend/requirements.txt), [config.py](backend/app/core/config.py) |
| Base de datos | PostgreSQL, SQLAlchemy y psycopg2-binary | PostgreSQL 16 en Docker y kind; SQLAlchemy `>=2.0,<3.0`; psycopg2 `>=2.9,<3.0` | [Compose](compose.yaml), [dependencias Kubernetes](deploy/k8s/dependencias.yaml), [requirements.txt](backend/requirements.txt) |
| Backend | boto3 para S3, Pillow para imágenes y fpdf2 para PDF | `>=1.37,<2.0`, `>=10,<14`, `>=2.7,<3.0`, respectivamente | [requirements.txt](backend/requirements.txt), [fotos](backend/app/services/triage_photos.py), [PDF](backend/app/services/pdf_service.py) |
| Infra local | Docker Desktop, Docker Compose, SeaweedFS, Kubernetes, kind y kubectl | SeaweedFS 4.53. Resto de versiones: No determinado – no se encontró evidencia en la carpeta | [Compose](compose.yaml), [README](README.md), [guía kind](deploy/k8s/README.md) |
| Despliegue cloud | Render Web Service, Supabase PostgreSQL y Supabase Storage S3 | Versión activa: No determinado – no se encontró evidencia en la carpeta | [Configuración cloud](README.md#variables-para-render-y-supabase), commit `893fda8` |
| Pruebas backend | unittest, SQLite en memoria y pruebas de triaje mediante funciones con aserciones | unittest y SQLite del entorno Python. Runner externo de triaje sin versión fijada | [Pruebas de alta](backend/tests/test_registro_paciente.py), [pruebas de triaje](backend/tests/test_triaje_service.py) |
| Pruebas web y móvil | Node.js, Playwright y Chrome; flutter_test y flutter_lints | Versiones web sin fijar; flutter_test del SDK; flutter_lints `^6.0.0` | [Pruebas web](frontend/tests/panel.spec.mjs), [guía UX](frontend/UX_IMPLEMENTACION.md), [prueba Flutter](app_movil/test/widget_test.dart), [pubspec.yaml](app_movil/pubspec.yaml) |
| CI/CD | Pipeline versionado | No determinado – no se encontró evidencia en la carpeta | Inventario Git de `893fda8`. Hay Dockerfile, manifiestos y guías de despliegue manual |

## Arquitectura del sistema

- **Clientes.** El navegador recibe el panel y llama a la API en el mismo origen. Flutter usa `API_BASE_URL` y el cliente HTTP compartido. Ambos envían un token Bearer. El panel lo guarda en `sessionStorage` y Flutter usa `FlutterSecureStorage`. [Entrada FastAPI](backend/app/main.py) · [Sesión web](frontend/js/session.js) · [URL móvil](app_movil/lib/core/constants/api_constants.dart) · [Sesión móvil](app_movil/lib/core/services/session_store.dart).
- **API y dominio.** `app/main.py` monta el panel y registra las rutas bajo `/api`. `api/routes/` expone los módulos, `api/deps.py` resuelve usuario y acceso a pacientes, `schemas/` define contratos, `services/` contiene las reglas y `crud/` consulta o modifica datos. [Entrada](backend/app/main.py) · [Router](backend/app/api/__init__.py) · [Autorización](backend/app/api/deps.py).
- **Datos.** `usuarios` identifica tutores y personal. `pacientes.tutor_id` vincula cada mascota con su tutor. `historial_clinico` registra motivo, respuestas, prioridad, referencia de foto, estado y revisión. `vacunaciones` registra refuerzos, fechas y estados. La aplicación accede a estos datos mediante SQLAlchemy. [Modelos](backend/app/models/models.py) · [Conexión y esquema](backend/app/db/database.py).
- **Fotografías.** FastAPI valida el tipo y el límite de 8 MiB, genera una clave de objeto y persiste la referencia. Las fotos se recuperan a través de una ruta autenticada. El servicio también reconoce referencias de fotos locales anteriores si el archivo sigue disponible. En Compose el almacén es SeaweedFS. La configuración publicada prevé Supabase Storage. [Servicio de fotos](backend/app/services/triage_photos.py) · [Ruta protegida](backend/app/api/routes/historial.py) · [Compose](compose.yaml).
- **Topología.** Compose ejecuta `app`, `db` y `objetos`, publica solo la aplicación en loopback y conserva registros y archivos en volúmenes. En kind, un Service distribuye peticiones a dos réplicas con PostgreSQL y SeaweedFS compartidos. El esquema se inicializa con un Job y los contenedores reciben Kubernetes Secrets. El esquema previsto en la nube es **Android y navegador → HTTPS de Render → FastAPI → PostgreSQL y S3 de Supabase**. [Compose](compose.yaml) · [API Kubernetes](deploy/k8s/api.yaml) · [Job](deploy/k8s/esquema.yaml) · [Variables cloud](README.md#variables-para-render-y-supabase).

### Flujo del triaje

1. El tutor inicia sesión, elige una mascota y completa las respuestas de sangrado activo, apetito, actividad y dolor al tacto. Puede añadir temperatura, motivo u observaciones y una foto. Flutter envía JSON sin foto o multipart con foto a `POST /api/historial/triaje`. [Pantalla de triaje](app_movil/lib/features/triaje/presentation/triage_screen.dart) · [Ruta de triaje](backend/app/api/routes/historial.py).
2. FastAPI verifica el acceso a la mascota, calcula prioridad, guarda el caso en estado pendiente y devuelve el puntaje y el nivel. El motor suma 40 por sangrado activo, 10 o 20 por apetito reducido o ausencia de apetito, 15 o 30 por aletargamiento o inmovilidad, 15 por dolor y 15 o 30 por temperatura desde 39,5 o 40 °C dentro del rango válido hasta 45 °C. Con 60 o más clasifica como crítica, entre 30 y 59 como moderada y por debajo de 30 como leve. Si hay menos de dos campos clínicos presentes, devuelve `insuficiente` y puntaje nulo. [Motor](backend/app/services/triaje_service.py) · [Creación del caso](backend/app/api/routes/historial.py).
3. El panel carga `GET /api/historial/pendientes` y ordena por severidad y puntaje. El personal consulta la foto por `GET /api/historial/{id}/foto` y guarda la revisión con `PATCH /api/historial/{id}/revisar`. El caso sale de la cola y el historial conserva las notas y el identificador del usuario que revisó. [Panel de triaje](frontend/js/views/resumen.js) · [Rutas de historial](backend/app/api/routes/historial.py) · [Persistencia de revisión](backend/app/crud/crud_historial.py).

## Funcionalidades implementadas

- **Autenticación, sesión y navegación web.** Login, consulta del usuario, cierre en el cliente, tokens firmados, acceso por rol y rutas web mediante hash. El backend puede migrar contraseñas antiguas a PBKDF2 al validar el login. Commit `e1256db` y changelog histórico `e1256db:cambios.md`, Sprint A. [Ruta de autenticación](backend/app/api/routes/auth.py) · [Router web](frontend/js/router.js).
- **Ficha clínica, PDF y vacunación.** Consulta y edición de datos permitidos, historial por paciente, PDF, programación, reprogramación, registro de aplicación, eliminación y consulta de alertas de refuerzos. El calendario web presenta vistas por mes, semana y lista y ofrece filtros y avisos visuales. Commits `11f9c28` y `2665008`. [Contrato de API](frontend/FRONTEND_API_CONTRACT.md) · [Calendario](frontend/UX_IMPLEMENTACION.md).
- **Alta conjunta de tutor y paciente.** Un veterinario o administrador puede crear ambas entidades en una transacción. El flujo valida correo, evita duplicados y revierte el alta de tutor si falla la de paciente. Commit `2665008`. [Guía del registro](frontend/REGISTRO_PACIENTES.md) · [Servicio](backend/app/services/registro_paciente_service.py).
- **App Flutter.** Inicio de sesión, selección de mascota, envío de triaje con foto opcional y consulta del calendario de vacunas. El móvil muestra el resultado preliminar devuelto por la API. [Flujo móvil](app_movil/README.md) · [Código de la app](app_movil/lib/features).
- **Motor de triaje y manejo de datos insuficientes.** Cálculo por reglas, validación de temperatura y estado sin puntaje ante respuestas incompletas según la regla vigente. Commit `f82d8bc`. [Servicio](backend/app/services/triaje_service.py) · [Pruebas](backend/tests/test_triaje_service.py).
- **Contenedores, roles y fotos privadas.** Arranque con Compose, autorización por propietario, almacenamiento privado compatible con S3, endpoint de fotografía autenticado y dos réplicas en kind. Commit `de5c094`. [Dockerfile](Dockerfile) · [Compose](compose.yaml) · [Autorización](backend/app/api/deps.py) · [Kubernetes](deploy/k8s/README.md).
- **Preparación de Supabase.** El commit `893fda8` añade `backend/run_supabase.py` y modifica `.env.example`. El script configura una conexión PostgreSQL y S3 y arranca Uvicorn en loopback. El Dockerfile arranca Uvicorn directamente y el README describe las variables para Render. [Script local](backend/run_supabase.py) · [Dockerfile](Dockerfile) · [Variables cloud](README.md#variables-para-render-y-supabase).

## Funcionalidades pendientes / en progreso

- **Publicación en Render y verificación de Supabase.** Confirmar que el servicio HTTPS responde, inicializa su esquema, guarda y recupera fotos del bucket privado y conserva los datos tras un redespliegue. El commit `893fda8` acredita preparación local. URL y resultado del despliegue: No determinado – no se encontró evidencia en la carpeta. [README](README.md#variables-para-render-y-supabase) · [Script local](backend/run_supabase.py).
- **Validación desde Android físico en otra red.** Falta evidencia local de un APK conectado al servicio publicado y de la prueba completa por datos móviles con revisión web y rechazo a un segundo tutor. El código admite `API_BASE_URL`; su valor por defecto aún apunta a un túnel ngrok. La configuración Android firma `release` con la clave de depuración. [Configuración móvil](app_movil/lib/core/constants/api_constants.dart) · [Firma Android](app_movil/android/app/build.gradle.kts) · [Guía móvil](app_movil/README.md).
- **Configuración de secretos cloud.** La rama contiene valores aparentemente sensibles en archivos versionados. La puesta en servicio debe contemplar su rotación en el proveedor, el retiro de los valores del código y la configuración de los nuevos secretos en el entorno de Render. [Plantilla versionada](.env.example) · [Script local](backend/run_supabase.py) · Commit `893fda8`.
- **Validación pendiente documentada.** La guía del alta conjunta deja pendiente la comprobación final de ese flujo con FastAPI y PostgreSQL reales. La prueba de navegador simula la API y la prueba de alta usa SQLite en memoria. [Verificación del alta](frontend/REGISTRO_PACIENTES.md#verificación) · [Verificación del panel](frontend/UX_IMPLEMENTACION.md#verificación).
- **Backlog formal y fuera de alcance acordado.** No determinado – no se encontró evidencia en la carpeta. El changelog histórico y los commits identifican trabajo realizado, pero en la rama revisada no hay exportación del tablero, números de issues ni estados de cierre contrastables. Evidencia: inventario Git de `893fda8` y changelog histórico `e1256db:cambios.md`.

## Roles y usuarios del sistema

- **Tutor.** Usa Flutter para seleccionar sus mascotas, enviar triajes y consultar su calendario. La API autoriza sus recursos por propiedad, incluidas las consultas de historial, PDF y foto cuando existen. [Pacientes](backend/app/api/routes/pacientes.py) · [Historial](backend/app/api/routes/historial.py) · [Vacunación](backend/app/api/routes/vacunacion.py).
- **Veterinario.** Accede al panel, ve la cola global, registra pacientes y tutores, edita datos habilitados, revisa casos y gestiona refuerzos. [Panel](frontend/index.html) · [Rutas de pacientes](backend/app/api/routes/pacientes.py) · [Revisión](backend/app/api/routes/historial.py) · [Vacunación](backend/app/api/routes/vacunacion.py).
- **Administrador.** Comparte permisos operativos del personal y puede listar y crear usuarios desde la API de usuarios. [Rutas de usuarios](backend/app/api/routes/usuarios.py) · [Roles en la API](backend/app/api/deps.py).

## Estado actual del proyecto

- **Versión examinada.** Rama `fabio/despliegue-render`, commit `893fda8`. En las referencias Git disponibles localmente, la rama contiene diez commits sobre `origin/main`. Evidencia: `git log --all` y `git rev-list --left-right --count origin/main...HEAD`. Los hallazgos corresponden a esa rama.
- **Hito local.** La guía de kind registra que ambas réplicas sirvieron la misma foto, que rechazaron el acceso de un tutor ajeno y que las 30 consultas de la prueba respondieron HTTP 200 mientras se reemplazaba un pod. El reemplazo quedó listo en 5,0 s. El clúster probado tenía un nodo y la medición corresponde a la caída de una réplica de FastAPI. [Evidencia local](deploy/k8s/README.md#evidencia-de-la-prueba-local).
- **Verificación de esta revisión.** Pasaron `docker compose config --quiet` y las cinco funciones de prueba del motor de triaje. La inspección no realizó un despliegue ni intentó autenticar con las credenciales encontradas. [Compose](compose.yaml) · [Pruebas del motor](backend/tests/test_triaje_service.py).
- **Riesgo de credenciales.** Retirar `backend/.env` dejó de versionar ese archivo en el árbol actual. La última revisión volvió a incorporar valores de acceso en `.env.example` y `backend/run_supabase.py`. Su vigencia es desconocida y, si son reales, deben tratarse como expuestos. El script también fija una clave de firma de ejemplo. [Control de exclusión](.gitignore) · [Plantilla](.env.example) · [Script](backend/run_supabase.py) · Commits `de5c094` y `893fda8`.
- **Límite del motor.** El criterio de suficiencia cuenta campos presentes, aunque su valor sea inválido para puntuar. La app valida la temperatura y obliga a contestar cuatro preguntas. Un cliente directo de la API puede proporcionar campos presentes que el motor no reconoce y obtener una prioridad leve. Es una brecha de validación que conviene tener en cuenta al interpretar ese resultado. [Motor](backend/app/services/triaje_service.py) · [Validación móvil](app_movil/lib/features/triaje/presentation/triage_screen.dart) · [Validación de payload](backend/app/api/routes/historial.py).
- **Límites de sesión y esquema.** El logout descarta el token en el cliente. La API mantiene tokens firmados hasta su vencimiento y la configuración por defecto les da siete días. El esquema se inicializa con `create_all()` y cambios SQL idempotentes en `ensure_schema()`; el repositorio no muestra migraciones numeradas. [Seguridad](backend/app/core/security.py) · [Configuración](backend/app/core/config.py) · [Esquema](backend/app/db/database.py).
- **Diferencias entre guía y código.** Para `insuficiente`, el código amplía los tres niveles enumerados en la sección móvil del contrato. Para archivos y roles vigentes, prevalecen las rutas y el servicio actuales sobre el changelog del Sprint B. [Contrato móvil](frontend/FRONTEND_API_CONTRACT.md#app-móvil) · [Motor](backend/app/services/triaje_service.py) · [Ruta de foto](backend/app/api/routes/historial.py).

## Cómo ejecutar / levantar el proyecto

### Docker Compose

Abre Docker Desktop en modo Linux y ejecuta desde la raíz. Si ya existe un `.env` con claves locales, consérvalas. Si el archivo no existe, el README documenta cómo crear claves de desarrollo independientes. Para la ejecución local basta con `VET_SECRET_KEY` y `VET_OBJECT_KEY`; Compose configura internamente el PostgreSQL y SeaweedFS locales. Evita copiar valores de acceso publicados en la plantilla de esta revisión. [README de arranque](README.md#ejecutar-con-docker-compose) · [Compose](compose.yaml).

```powershell
if (-not (Test-Path .env)) {
    $firma = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
    $objetos = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
    @("VET_SECRET_KEY=$firma", "VET_OBJECT_KEY=$objetos") | Set-Content .env -Encoding ascii
}
docker compose up --build --wait
docker compose ps
docker compose exec app python seed_data.py
```

- Panel en `http://127.0.0.1:8000/`, Swagger en `/docs` y comprobación de dependencias en `/ready`. Para la demo local, el README proporciona el veterinario ficticio `vet@sanfrancisco.bo` y el tutor `maria.rojas@example.com`, ambos con `123456`. Usa `docker compose down` para detener el entorno conservando los volúmenes. [README de arranque](README.md#ejecutar-con-docker-compose) · [Seed](backend/seed_data.py).
- Para Android por USB se requiere Flutter, ADB y depuración USB. El puerto del host solo se publica en loopback. Si cambias el puerto de Compose con `VET_HTTP_PORT`, ajusta el segundo puerto de `adb reverse`. [README](README.md#3-probar-el-triaje-desde-android-por-usb) · [Puertos Compose](compose.yaml).

```powershell
adb reverse tcp:8000 tcp:8000
Set-Location app_movil
flutter pub get
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:8000
```

### Kubernetes local

Con Docker Desktop, kind y kubectl, crea el clúster y carga la misma imagen. Aplica dependencias, crea los Secrets con el bloque de la guía, ejecuta el Job de esquema y despliega la API en ese orden. La guía documenta el acceso mediante `port-forward` a `http://127.0.0.1:8001/`. [Procedimiento completo y comandos](deploy/k8s/README.md).

### Render y Supabase

Según el README, Render ejecutaría el Dockerfile y recibiría `DATABASE_URL` con TLS, `SECRET_KEY`, `S3_BUCKET`, `S3_ENDPOINT_URL`, `AWS_DEFAULT_REGION`, `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` por variables de entorno. Flutter recibiría el dominio HTTPS mediante `API_BASE_URL`. En Compose se mantienen las claves locales `VET_*` y el almacén local. El script de Supabase de esta revisión contiene valores fijados en código y no se recomienda para ejecutar contra un proyecto real. [Variables cloud](README.md#variables-para-render-y-supabase) · [Dockerfile](Dockerfile) · [Script](backend/run_supabase.py).

### Pruebas disponibles

Desde la raíz y con Node.js, Playwright y Chrome instalados:

```powershell
node frontend/tests/panel.spec.mjs
```

Desde `backend/`, con las dependencias instaladas en el Python activo:

```powershell
python -m unittest discover -s tests -p test_registro_paciente.py -v
```

Desde `app_movil/`, con Flutter configurado:

```powershell
flutter test
```

[Pruebas web](frontend/UX_IMPLEMENTACION.md#verificación) · [Pruebas de alta](frontend/REGISTRO_PACIENTES.md#verificación) · [Prueba móvil](app_movil/test/widget_test.dart).

## Estructura de archivos relevante

```text
PS3_VeterinariaAsis/
├── README.md                         Arranque local y configuración prevista en la nube
├── Context.md                        Contexto previo y reglas de triaje
├── .env.example                      Nombres de variables y configuración de ejemplo por sanear
├── Dockerfile                        Imagen de FastAPI y panel web
├── compose.yaml                      Servicios app, db y objetos y sus volúmenes
├── backend/
│   ├── requirements.txt              Dependencias Python declaradas
│   ├── seed_data.py                  Datos ficticios para desarrollo
│   ├── run_supabase.py               Script local agregado en el commit 893fda8
│   ├── tests/                        Pruebas de alta conjunta y del motor
│   └── app/
│       ├── main.py                   API, panel estático y comprobaciones de salud
│       ├── api/                      Rutas, autenticación y autorización
│       ├── core/                     Variables de entorno y firma de sesiones
│       ├── crud/                     Operaciones sobre registros
│       ├── db/                       Motor, sesiones e inicialización de esquema
│       ├── models/ y schemas/        Modelos SQLAlchemy y contratos Pydantic
│       └── services/                 Triaje, almacenamiento, PDF y registro conjunto
├── frontend/
│   ├── index.html y login.html       Entradas del panel y del inicio de sesión
│   ├── js/                          Router, sesión, cliente, servicios, componentes y vistas
│   ├── css/, assets/ y vendor/       Estilos, imágenes y FullCalendar
│   └── tests/                        Pruebas de navegador
├── app_movil/
│   ├── lib/core/                     Configuración, cliente HTTP y almacenamiento de sesión
│   ├── lib/features/                 Auth, pacientes, triaje y calendario
│   ├── android/, ios/, web/, ...     Configuración de plataformas Flutter
│   └── test/                         Prueba del widget de inicio de sesión
├── dataset/nuevas/                   Ubicación local para fotos históricas o ejecución sin S3
└── deploy/k8s/                       Manifiestos de dependencias, API y esquema para kind
```

Evidencia: inventario de directorios de `893fda8`, [Dockerfile](Dockerfile), [servicio de fotografías](backend/app/services/triage_photos.py) y [guía de Kubernetes](deploy/k8s/README.md).

## Convenciones y decisiones técnicas

- **Naming y organización.** La API usa nombres de recursos y campos en español, con `snake_case` en JSON y Python, por ejemplo `paciente_id` y `nivel_gravedad`. El panel usa rutas hash y módulos ES. Flutter agrupa por `features/` y comparte los clientes en `core/`. [Contrato](frontend/FRONTEND_API_CONTRACT.md) · [Router web](frontend/js/router.js) · [Estructura móvil](app_movil/lib).
- **Configuración.** Las variables se escriben en mayúsculas; las del proceso tienen prioridad sobre el `.env` de la raíz. Git y el contexto de build excluyen el archivo real. La API usa el SDK compatible con S3 en el servidor y el móvil recibe únicamente la URL de la API para conectarse. [Configuración](backend/app/core/config.py) · [Gitignore](.gitignore) · [Dockerignore](.dockerignore) · [Cliente S3](backend/app/services/triage_photos.py).
- **Contenedores y salud.** El Dockerfile ejecuta FastAPI con usuario sin privilegios. `/health` comprueba que la API responde y `/ready` comprueba PostgreSQL y el almacén configurado. En kind, la inicialización del esquema se ejecuta por separado mediante un Job. [Dockerfile](Dockerfile) · [Entrada API](backend/app/main.py) · [Job](deploy/k8s/esquema.yaml).
- **Calendario.** El panel conserva el día programado de la API y usa la zona `America/La_Paz` para fechas de formularios. Combina alertas globales con historial por paciente y deduplica por ID. [Reglas del calendario](frontend/UX_IMPLEMENTACION.md#integración-y-límites).
- **Estilo y ramas.** Flutter activa `flutter_lints`. Se observaron ramas de trabajo `Rod/Ajustes_backend`, `Rod/implementacion_contenedores`, `Validacion_Triaje_Fabio` y `fabio/despliegue-render` además de `main`. Política formal de ramas, convenciones de commits obligatorias y formateador común: No determinado – no se encontró evidencia en la carpeta. [Análisis Dart](app_movil/analysis_options.yaml) · Evidencia Git: `git branch -a` y `git log --all`.

## Referencias

- **Documentación vigente en la raíz.** [README.md](README.md), [Context.md](Context.md), [guía de Kubernetes](deploy/k8s/README.md) y [guía móvil](app_movil/README.md).
- **Documentación funcional.** [Contrato de API](frontend/FRONTEND_API_CONTRACT.md), [alta conjunta](frontend/REGISTRO_PACIENTES.md) y [UX y calendario](frontend/UX_IMPLEMENTACION.md).
- **Historial y tickets reconstruidos.** `11f9c28` (autenticación, triaje, PDF, vacunación), `e1256db` (login y organización), `2665008` (alta y UX), `f82d8bc` (motor), `de5c094` (contenedores, seguridad y Kubernetes), `893fda8` (configuración Supabase y Render). El changelog histórico de los sprints A y B se puede consultar con `git show e1256db:cambios.md`.
- **Requisitos.** Dentro de la raíz, un documento formal separado en Word, PDF o Markdown: No determinado – no se encontró evidencia en la carpeta. Como referencia externa de alcance académico, véase «Proyecto Integrador - 6to semestre», secciones de entregables y Anexo A de Cloud Computing, suministrado previamente en la conversación.
