# App móvil · Triaje Veterinario

Aplicación Flutter para tutores: login, selección de mascota, cuestionario de
triaje con foto opcional y calendario de vacunación.

## Requisitos

- Flutter SDK (incluye Dart) en el `PATH`.
- Backend de `PS3_VeterinariaAsis` en ejecución.
- Un destino para ejecutar:
  - Windows desktop (rápido para probar la lógica), o
  - Un teléfono Android por USB, o
  - Un emulador Android.

Comprobar herramientas:

```powershell
flutter doctor -v
flutter devices
```

## 1. Arrancar el backend

Desde `backend/`:

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

`--host 0.0.0.0` es necesario para que un teléfono en la misma red pueda
conectarse. El panel web queda en `http://127.0.0.1:8000/`.

## 2. Elegir la URL de la API

La app usa `API_BASE_URL`; si no se define, usa el túnel ngrok indicado en
`lib/core/constants/api_constants.dart`.

| Destino | Comando |
|---|---|
| Navegador (prueba rápida de UI) | `flutter run -d chrome --dart-define=API_BASE_URL=http://127.0.0.1:8000` |
| Windows desktop | `flutter run -d windows --dart-define=API_BASE_URL=http://127.0.0.1:8000` |
| Emulador Android | `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000` |
| Teléfono por USB | `adb reverse tcp:8000 tcp:8000` y `flutter run --dart-define=API_BASE_URL=http://127.0.0.1:8000` |
| Teléfono por Wi-Fi | `flutter run --dart-define=API_BASE_URL=http://IP_DE_TU_PC:8000` |
| Túnel ngrok | `ngrok http 8000` y `flutter run --dart-define=API_BASE_URL=https://TU_URL.ngrok-free.dev` |

En builds de desarrollo se permite HTTP local gracias a
`android/app/src/debug/AndroidManifest.xml`. En release solo HTTPS.

> El destino Windows requiere el workload **Desktop development with C++** de
> Visual Studio (incluye ATL). El destino Chrome no requiere Visual Studio ni
> Android y sirve para validar la UI y la conexión con la API rápidamente; el
> backend ya permite CORS.

## 3. Iniciar sesión

La app está pensada para tutores. Usuarios sembrados por `seed_data.py`
(contraseña `123456`):

| Tutor | Email | Mascota |
|---|---|---|
| María Fernanda Rojas | `maria.rojas@example.com` | Luna |
| Diego Alarcón | `diego.alarcon@example.com` | Milo |
| Lucía Vargas | `lucia.vargas@example.com` | Canela |

Los usuarios `veterinario`/`admin` pueden iniciar sesión, pero no tienen
mascotas asociadas; usan el panel web.

## 4. Flujo de prueba

1. Inicia sesión con un tutor.
2. Selecciona una mascota.
3. Pulsa **Iniciar cuestionario de triaje**.
4. Responde las preguntas 1–4, escribe el motivo y adjunta una foto (opcional).
5. Envía el reporte: debe aparecer el nivel de riesgo calculado.
6. Abre el panel web (`http://127.0.0.1:8000/`), entra como
   `vet@sanfrancisco.bo` / `123456` y verifica que el caso aparece en
   **Resumen**. Abre el caso en el panel para comprobar que carga la foto protegida.
7. En la app, abre el calendario de vacunas de la mascota para ver los
   refuerzos futuros.

## Problemas comunes

- **Connection refused / timeout**: el backend debe escuchar en `0.0.0.0`,
  el teléfono y la PC deben estar en la misma red y el Firewall de Windows
  debe permitir el puerto 8000 en redes privadas.
- **`CLEARTEXT communication not permitted`**: estás usando una build release
  o el manifest de debug no se aplicó. Usa `flutter run` (debug) o un túnel
  HTTPS.
- **La app muestra un HTML de ngrok**: añade la cabecera
  `ngrok-skip-browser-warning` o usa la URL HTTPS del túnel.
- **No aparecen mascotas**: el tutor autenticado no tiene pacientes asociados.
  Prueba con `maria.rojas@example.com`.
- **Token expirado**: cierra sesión y vuelve a entrar; los tokens duran 7 días.
