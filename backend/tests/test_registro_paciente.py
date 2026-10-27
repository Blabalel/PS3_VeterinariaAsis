"""HTTP/ORM regression tests using SQLite in memory; never connect to PostgreSQL.

Run from backend/: python -m unittest discover -s tests -p test_registro_paciente.py -v
"""
import asyncio
import copy
import json
import os
import unittest
from datetime import date, timedelta
from unittest.mock import patch

# Set before importing application dependencies. Do not import app.main (startup DDL).
os.environ["DATABASE_URL"] = "sqlite://"
from fastapi import FastAPI
from sqlalchemy import create_engine, event
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.api.routes.pacientes import router
from app.core.security import create_access_token, verify_password
from app.models.models import Base, Paciente, Usuario


class RegistroPacienteTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.factory = sessionmaker(bind=self.engine)
        self.app = FastAPI()
        self.app.include_router(router, prefix="/api")
        def database():
            with self.factory() as db:
                yield db
        self.app.dependency_overrides[get_db] = database
        self.tokens = {}
        with self.factory() as db:
            for role in ["admin", "veterinario", "tutor"]:
                user = Usuario(nombre=role, email=f"{role}@example.test", rol=role, password_hash="unused")
                db.add(user)
                db.flush()
                self.tokens[role] = create_access_token(user.id, role, role)
            db.commit()
        self.body = {
            "tutor": {"nombre": " Ana Pérez ", "email": " NUEVO@EXAMPLE.TEST ", "password": "Prueba-2026", "telefono": "70000000", "direccion": "Av. Central 123"},
            "paciente": {"nombre": " Toby ", "especie": "Canino", "raza": "Mestizo", "sexo": "Macho", "peso_kg": 12.5, "fecha_nacimiento": "2024-05-10", "alergias": "Sin información"},
        }

    def tearDown(self):
        self.engine.dispose()

    def request(self, body=None, role="veterinario"):
        async def call():
            raw = json.dumps(body if body is not None else self.body).encode()
            headers = [(b"content-type", b"application/json")]
            if role: headers.append((b"authorization", f"Bearer {self.tokens[role]}".encode()))
            scope = {"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": "POST", "scheme": "http", "path": "/api/pacientes/registro-con-tutor", "raw_path": b"/api/pacientes/registro-con-tutor", "query_string": b"", "headers": headers, "client": ("127.0.0.1", 1), "server": ("test", 80), "root_path": ""}
            sent = []
            delivered = False
            async def receive():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {"type": "http.request", "body": raw, "more_body": False}
                await asyncio.sleep(0)
                return {"type": "http.disconnect"}
            async def send(message): sent.append(message)
            await self.app(scope, receive, send)
            status = next(item["status"] for item in sent if item["type"] == "http.response.start")
            result = b"".join(item.get("body", b"") for item in sent if item["type"] == "http.response.body")
            return status, json.loads(result)
        return asyncio.run(call())

    def test_veterinario_crea_ambos_y_guarda_hash(self):
        status, response = self.request()
        self.assertEqual(status, 201)
        self.assertEqual(response["nombre"], "Toby")
        self.assertEqual(response["tutor"]["email"], "nuevo@example.test")
        self.assertEqual(response["tutor_id"], response["tutor"]["id"])
        self.assertNotIn("password", json.dumps(response))
        with self.factory() as db:
            tutor = db.get(Usuario, response["tutor_id"])
            self.assertEqual(tutor.rol, "tutor")
            self.assertEqual(tutor.telefono, "70000000")
            self.assertTrue(verify_password("Prueba-2026", tutor.password_hash))
            self.assertNotEqual(tutor.password_hash, "Prueba-2026")

    def test_administrador_puede_registrar(self):
        self.assertEqual(self.request(role="admin")[0], 201)

    def test_sin_sesion_y_tutor_no_pueden_registrar(self):
        self.assertEqual(self.request(role=None)[0], 401)
        self.assertEqual(self.request(role="tutor")[0], 403)
        with self.factory() as db: self.assertEqual(db.query(Paciente).count(), 0)

    def test_correo_duplicado_no_crea_otro_registro(self):
        self.assertEqual(self.request()[0], 201)
        body = copy.deepcopy(self.body)
        body["tutor"]["email"] = "Nuevo@Example.Test"
        self.assertEqual(self.request(body)[0], 409)
        with self.factory() as db:
            self.assertEqual(db.query(Paciente).count(), 1)
            self.assertEqual(db.query(Usuario).count(), 4)

    def test_validaciones_no_escriben_datos(self):
        changes = [
            ("tutor", "email", "correo-invalido"), ("tutor", "password", "123"),
            ("tutor", "nombre", " "), ("paciente", "nombre", " "),
            ("paciente", "peso_kg", -1), ("paciente", "peso_kg", 0),
            ("paciente", "fecha_nacimiento", (date.today() + timedelta(days=2)).isoformat()),
            ("tutor", "rol", "admin"), ("paciente", "tutor_id", 1),
        ]
        for group, key, value in changes:
            with self.subTest(field=key, value=value):
                body = copy.deepcopy(self.body)
                body[group][key] = value
                self.assertEqual(self.request(body)[0], 422)
        with self.factory() as db:
            self.assertEqual(db.query(Paciente).count(), 0)
            self.assertEqual(db.query(Usuario).count(), 3)

    def test_fallo_al_insertar_paciente_revierte_tutor(self):
        def fail(*args): raise SQLAlchemyError("simulated patient insert failure")
        event.listen(Paciente, "before_insert", fail)
        try: self.assertEqual(self.request()[0], 503)
        finally: event.remove(Paciente, "before_insert", fail)
        with self.factory() as db:
            self.assertEqual(db.query(Paciente).count(), 0)
            self.assertEqual(db.query(Usuario).count(), 3)
        self.assertEqual(self.request()[0], 201)


if __name__ == "__main__":
    unittest.main()
