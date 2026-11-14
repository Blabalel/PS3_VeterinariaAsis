# Despliegue en Kubernetes local

El clúster de desarrollo ejecuta dos réplicas de FastAPI con el panel web.
Las dos réplicas usan el mismo PostgreSQL y el mismo bucket privado de
SeaweedFS, compatible con S3. Los datos de este clúster están en volúmenes
propios. Usa las cuentas y los pacientes ficticios de `seed_data.py`.

## Preparar el clúster

Requiere Docker Desktop con contenedores Linux, `kind` y `kubectl`. Ejecuta
desde la raíz del repositorio. El archivo de conexión queda separado del
contexto habitual de kubectl.

```powershell
$kubeconfig = Join-Path ([IO.Path]::GetTempPath()) 'veterinaria-kind.yaml'
kind create cluster --name veterinaria-asis --kubeconfig $kubeconfig
$vetKube = @('--kubeconfig', $kubeconfig, '--context', 'kind-veterinaria-asis')
$vetNamespace = $vetKube + @('-n', 'veterinaria')

docker build -t veterinaria-asis:local .
kind load docker-image veterinaria-asis:local --name veterinaria-asis
kubectl @vetKube apply -f deploy/k8s/dependencias.yaml
```

## Crear los secretos una vez

Ejecuta este bloque en la primera instalación. Conserva los Secrets mientras
uses los mismos volúmenes, porque PostgreSQL solo aplica su contraseña inicial
cuando inicializa el volumen. Los valores se crean en Kubernetes mediante un archivo temporal que se elimina al final.

```powershell
$shared = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$dbPassword = [Guid]::NewGuid().ToString('N')
$signature = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$s3Keys = @('AWS_ACCESS_KEY_ID=veterinaria-local', "AWS_SECRET_ACCESS_KEY=$shared")
$dbUrl = "postgresql+psycopg2://veterinaria:${dbPassword}@db:5432/veterinaria"

$secretFile = [IO.Path]::GetTempFileName()
try {
    ($s3Keys + "POSTGRES_PASSWORD=$dbPassword") | Set-Content -LiteralPath $secretFile -Encoding ascii
    kubectl @vetNamespace create secret generic veterinaria-local --from-env-file=$secretFile
    if ($LASTEXITCODE) { throw 'No se pudo crear el Secret de PostgreSQL y S3.' }

    ($s3Keys + @("DATABASE_URL=$dbUrl", "SECRET_KEY=$signature")) | Set-Content -LiteralPath $secretFile -Encoding ascii
    kubectl @vetNamespace create secret generic veterinaria-api --from-env-file=$secretFile
    if ($LASTEXITCODE) { throw 'No se pudo crear el Secret de la API.' }
} finally {
    Remove-Item -LiteralPath $secretFile
}
```

## Inicializar y acceder al sistema

```powershell
kubectl @vetNamespace rollout status deployment/postgres --timeout=120s
kubectl @vetNamespace rollout status deployment/objetos --timeout=120s
kubectl @vetNamespace apply -f deploy/k8s/esquema.yaml
kubectl @vetNamespace wait --for=condition=complete job/veterinaria-esquema --timeout=120s
kubectl @vetNamespace apply -f deploy/k8s/api.yaml
kubectl @vetNamespace rollout status deployment/veterinaria-api --timeout=120s
kubectl @vetNamespace exec deployment/veterinaria-api -- python seed_data.py
kubectl @vetNamespace port-forward service/veterinaria-api 8001:8000
```

Abre <http://127.0.0.1:8001/> y usa el usuario veterinario de demostración
indicado en el README principal. `/health` comprueba que la API responde.
`/ready` comprueba que la API puede consultar PostgreSQL y el bucket.

Para actualizar una imagen cargada con la misma etiqueta, vuelve a ejecutar
`docker build` y `kind load docker-image`, y reinicia el Deployment con
`kubectl @vetNamespace rollout restart deployment/veterinaria-api`. Si
cambia el esquema, vuelve a ejecutar el Job de esquema antes de desplegar la
nueva versión.

## Evidencia de la prueba local

El 13 de noviembre de 2026 se comprobó el envío de un triaje con un PNG
ficticio desde la API del tutor y su revisión desde el panel en Chrome.
Las dos réplicas devolvieron la misma foto protegida. El segundo tutor
recibió un rechazo al intentar acceder a la mascota ajena o a su foto.

Se eliminó un pod de la API mientras se enviaban 30 solicitudes de lectura
autenticadas de esa foto al Service desde el nodo del clúster. Las 30
respondieron HTTP 200 y el pod de reemplazo estuvo listo en 5,0 segundos.
La medición cubre la caída de una réplica de la API en el clúster local de
un nodo. El port-forward se usa para la demostración en el navegador y
puede requerir reconexión si termina el pod al que estaba enlazado.
