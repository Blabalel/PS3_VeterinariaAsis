"""Backward compatibility entry point - delegates to app.main."""
from app.main import app

# Re-export para que `uvicorn main:app` siga funcionando.
__all__ = ["app"]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)