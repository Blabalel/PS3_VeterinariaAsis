# Contexto del sistema veterinario

El sistema permite que el tutor reporte el estado de una mascota desde el celular. El equipo veterinario recibe el caso en una cola de triaje, revisa las respuestas y la fotografía adjunta, y guarda sus observaciones en el historial clínico. El panel también permite gestionar pacientes, tutores y vacunas, y descargar el historial de un paciente en PDF.

## Componentes

- **App móvil**. Flutter ofrece inicio de sesión, selección de mascota, cuestionario de triaje, cámara o galería y consulta del calendario de vacunas.
- **Panel veterinario**. La interfaz web de HTML, CSS y JavaScript incluye la cola de triaje, revisión asíncrona de reportes, pacientes, historial, vacunación y reportes.
- **Backend**. FastAPI sirve el panel y la API REST bajo `/api`. Valida la sesión y los permisos, calcula el nivel de triaje y coordina el almacenamiento. PostgreSQL guarda los usuarios, pacientes, casos, revisiones y vacunas. Las fotografías nuevas se guardan en un bucket privado compatible con S3 cuando ese almacenamiento está configurado.
- **Entorno local**. Docker Compose levanta FastAPI y el panel juntos en el servicio `app`, PostgreSQL en `db` y SeaweedFS en `objetos`. Docker conserva los datos y fotos en volúmenes. Kubernetes local ejecuta dos réplicas de la misma aplicación con PostgreSQL y SeaweedFS compartidos entre ambas. Render y Supabase son los servicios previstos para la publicación.

## Flujo del triaje

1. El tutor inicia sesión y selecciona una de sus mascotas. Responde si hay sangrado activo y dolor al tacto, y cómo están el apetito y la actividad. Puede añadir temperatura, motivo u observaciones y una fotografía.
2. Flutter envía el reporte a `POST /api/historial/triaje`. Envía JSON cuando el reporte viene sin foto y un formulario multipart cuando incluye un archivo. La API valida que el tutor tenga acceso a la mascota.
3. El backend calcula la prioridad con el cuestionario. Si hay una foto, valida su formato y tamaño. Se admiten JPEG, PNG y WebP de hasta 8 MB. La API guarda el caso como pendiente en PostgreSQL, con una referencia a la foto cuando corresponde, y devuelve el puntaje y nivel preliminar a Flutter.
4. El panel consulta `GET /api/historial/pendientes` con una sesión de veterinario o administrador. Ordena primero por gravedad, de crítica a leve, y después por puntaje descendente dentro de cada nivel. Los casos sin clasificación aparecen después.
5. Al abrir el reporte, el panel solicita la foto a `GET /api/historial/{id}/foto` con el token de la sesión. La ruta también permite el acceso del tutor de la mascota. Cuando el veterinario guarda la revisión, la API registra las notas y el identificador de quien revisó. El caso sale de la cola y queda disponible en el historial.

## Cálculo de prioridad

El [motor de triaje](backend/app/services/triaje_service.py) aplica reglas fijas al cuestionario. El resultado ayuda a priorizar la revisión veterinaria. La foto se usa como evidencia visual durante esa revisión.

- **Sangrado activo** suma 40 puntos.
- **Apetito** suma 10 si está reducido y 20 si la mascota no come.
- **Actividad** suma 15 si está aletargada y 30 si está inmóvil.
- **Temperatura** suma 15 desde 39,5 °C hasta menos de 40 °C y 30 desde 40 °C. Para el cálculo se aceptan valores entre 30 y 45 °C. Una temperatura ausente o inválida no suma puntos.
- **Dolor al tacto** suma 15 puntos.

Con **60 puntos o más** el caso es crítico. Entre **30 y 59** es moderado. Por debajo de **30** es leve. Si el motor recibe menos de dos campos clínicos con valor, devuelve `insuficiente` y deja el puntaje sin calcular. El panel muestra esos casos como **Sin clasificar** y el móvil como **Pendiente de cálculo**.

Consulta el [README](README.md#ejecutar-con-docker-compose) para levantar el sistema y la [guía de Kubernetes local](deploy/k8s/README.md) para reproducir la prueba con dos réplicas.
