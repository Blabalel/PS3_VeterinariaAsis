# Panel clínico: navegación y calendario de vacunación

## Uso

El panel conserva HTML/CSS y módulos JavaScript, la autenticación y el mismo origen de la API. Se ejecuta como indica el README principal: iniciar FastAPI y abrir `http://127.0.0.1:8000/`. No requiere npm, React ni compilación.

El menú contiene Triaje / Cola, Telemedicina, Pacientes / Historial, Vacunación y Reportes. Las rutas anteriores siguen funcionando. La revisión del reporte es compartida entre Triaje y Telemedicina; las notas solo se guardan cuando la API confirma la revisión.

En Vacunación se puede cambiar entre Mes, Semana y Lista, desplazarse entre períodos, filtrar por mascota/vacuna/estado, registrar una aplicación y reprogramar. El detalle ofrece historial de vacunas y consultas recientes. Los recordatorios abarcan hoy y los siete días siguientes y respetan los filtros; los indicadores superiores abarcan todos los registros cargados. La vista elegida se recuerda localmente.

## Integración y límites

- FullCalendar Standard 6.1.19 se distribuye localmente en `vendor/`, con traducción española y licencia MIT. No se requiere conexión a una CDN durante el uso. Se conservó una versión fija para evitar actualizaciones implícitas. Documentación: https://legacy.fullcalendar.io/docs/v6
- La cola conserva el orden por gravedad y luego puntaje. El indicador de antigüedad se calcula desde `fecha_consulta`; no representa llegada presencial ni modifica la prioridad del motor.
- El estado `programada` se presenta como Pendiente. El umbral de Próxima del backend sigue siendo de 30 días; el recordatorio de siete días es independiente.
- La consulta global de alertas excluye vacunas aplicadas. El calendario combina esa consulta con el historial por paciente, deduplica por ID y limita la concurrencia a cuatro consultas. El directorio se pagina de 500 en 500. Una caché en memoria de 60 segundos se invalida tras registrar o reprogramar; Actualizar fuerza la consulta.
- Si hay errores parciales, se muestra Historial incompleto y se permite reintentar. Los datos anteriores permanecen visibles ante una caída total con una advertencia de desactualización.
- No existe un campo de dosis estructurado en el contrato actual. Se muestra Dosis no registrada; las observaciones permiten leer lo documentado, sin inferir números de dosis.
- Las canceladas se omiten del calendario operativo y se conservan en el historial del paciente. Los registros sin fecha aparecen en una sección separada.
- Las fechas programadas conservan el día calendario de la API. Las fechas de formularios usan America/La_Paz y se serializan a mediodía de Bolivia. Las vacunas aplicadas se ubican por fecha de aplicación, conservando la fecha programada en el detalle.
- La revisión clínica, la aplicación y la reprogramación conservan los contratos existentes. No se añadieron endpoints, reglas de triaje, intervalos clínicos automáticos ni campos de base de datos.

## Archivos principales

- `js/app.js`: estructura y navegación de las cinco secciones.
- `js/views/calendar.js`: calendario, filtros, detalle y recordatorios.
- `js/calendar-model.js`: funciones de fechas y estados.
- `js/services/calendarService.js`: composición del historial y caché.
- `js/vaccine-forms.js`: programación, aplicación y reprogramación.
- `js/components/form.js`: validación en línea y protección del formulario.
- `css/clinical.css`: estilos compartidos, contraste, foco visible y adaptación a tablet.

## Verificación

Las pruebas no usan la base de datos. Un servidor de prueba entrega el frontend y simula las respuestas del contrato de API, incluyendo fallos de carga y guardado.

Requieren Node.js, Playwright y Chrome instalado:

```powershell
node frontend/tests/panel.spec.mjs
```

Si Playwright está instalado en otra ubicación, indicar su módulo con `PLAYWRIGHT_MODULE_PATH`. `BROWSER_CHANNEL` permite elegir otro canal compatible y `PANEL_TEST_OUTPUT` un directorio para las capturas.

Se verifican prioridad, antigüedad, filtros, protección de notas, consulta de historial sin perder el borrador, errores recuperables, calendario y aplicaciones, navegación por teclado y retorno del foco, reprogramación, validación, PDF, paginación de pacientes y ausencia de desbordamiento general a 1440, 1024, 768 y 390 píxeles. Las fechas se prueban con un navegador situado en otra zona horaria.

La prueba de contrato no reemplaza una comprobación con el entorno FastAPI/PostgreSQL real ni una evaluación completa con lector de pantalla.
