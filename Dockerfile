FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN groupadd --gid 10001 veterinaria \
    && useradd --uid 10001 --gid veterinaria --no-create-home veterinaria \
    && install -d -o veterinaria -g veterinaria /app/dataset/nuevas

COPY backend/app ./app
COPY backend/seed_data.py .
COPY frontend /app/frontend

USER veterinaria

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
