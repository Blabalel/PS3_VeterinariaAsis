import os
import uvicorn

# Inyectamos las credenciales directamente en el entorno de Python
os.environ["DATABASE_URL"] = "postgresql+psycopg2://postgres.wlrweeaxlqtdpmazedav:veterinaria123@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
os.environ["SECRET_KEY"] = "tu_clave_secreta_para_firmar_tokens"
os.environ["S3_BUCKET"] = "triaje-fotos"
os.environ["S3_ENDPOINT_URL"] = "https://wlrweeaxlqtdpmazedav.storage.supabase.co/storage/v1/s3"
os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
os.environ["AWS_ACCESS_KEY_ID"] = "e65b0362899d9f2cfad2697ff259761d"
os.environ["AWS_SECRET_ACCESS_KEY"] = "a3059a4ebf98c8188940098423f5114aab19ef21ed98e169ca906b4e84717c8d"

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
