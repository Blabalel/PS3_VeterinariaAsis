# Registro conjunto de paciente y tutor

## Uso

1. Iniciar sesión como veterinario o administrador.
2. Abrir Pacientes / Historial y pulsar Nuevo paciente.
3. Completar nombre y especie de la mascota. Opcionalmente registrar raza, sexo, nacimiento, peso y alergias.
4. Completar nombre, correo y contraseña inicial del nuevo tutor. Agregar teléfono y dirección si están disponibles.
5. Confirmar la contraseña y pulsar Guardar paciente y tutor.

El nuevo paciente aparece en el directorio vinculado a su tutor. El tutor puede utilizar el correo y la contraseña inicial para acceder a la app móvil. El formulario registra un tutor nuevo; si el correo pertenece a una cuenta existente, se rechaza la operación y se conservan los datos para revisarlos. No se modifica la cuenta existente ni se añade automáticamente otro paciente a ella.

## API

`POST /api/pacientes/registro-con-tutor`, autenticado con Bearer, admite exclusivamente roles `veterinario` y `admin`.

```json
{
  "paciente": {
    "nombre": "Toby",
    "especie": "Canino",
    "fecha_nacimiento": "2024-05-10",
    "peso_kg": 12.5
  },
  "tutor": {
    "nombre": "Ana Pérez",
    "email": "ana@example.test",
    "password": "UnaClaveInicial",
    "telefono": "70000000",
    "direccion": "Av. Central 123"
  }
}
```

- Responder `201` con la ficha del paciente y los datos públicos del tutor.
- Validar campos obligatorios, longitudes, correo, nacimiento no futuro y peso positivo.
- Normalizar el correo, comprobar duplicados sin distinguir mayúsculas y responder `409` ante un correo registrado.
- Asignar siempre el rol `tutor`, rechazar campos adicionales y guardar la contraseña mediante el hash PBKDF2 existente. La contraseña no se devuelve ni se guarda en el almacenamiento del navegador.
- Insertar ambas entidades en una única transacción. Deshacer la inserción del tutor si falla la creación del paciente y responder `503` ante un error de base de datos.
- Mantener las tablas, los endpoints anteriores y el motor de triaje. No requiere migraciones.

## Verificación

Desde la raíz, ejecutar las pruebas de navegador (requieren Node.js, Playwright y Chrome):

```powershell
node frontend/tests/panel.spec.mjs
```

Cubren los 12 escenarios anteriores y el alta conjunta: validación, protección del borrador, correo duplicado, fallos recuperables, prevención del doble envío, actualización del directorio y diseño del formulario en escritorio/tablet.

Desde `backend/`, ejecutar:

```powershell
python -m unittest discover -s tests -p test_registro_paciente.py -v
```

Las seis pruebas de backend usan la aplicación ASGI, autenticación real y SQLite en memoria. Verifican permisos, respuesta sin contraseñas, hash, normalización/duplicados, validación y rollback tras un fallo de inserción. No importan `app.main` ni conectan a PostgreSQL.

La comprobación final con el servidor FastAPI/PostgreSQL real queda pendiente. Reiniciar el backend si no se ejecuta con recarga automática y recargar el panel después de aplicar los cambios.
