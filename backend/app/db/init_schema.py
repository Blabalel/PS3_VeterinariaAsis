"""Initialize the schema once per deployment."""
from app.db.database import engine, ensure_schema
from app.models.models import Base


def initialize_schema():
    Base.metadata.create_all(bind=engine)
    ensure_schema()


if __name__ == "__main__":
    initialize_schema()
