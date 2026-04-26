"""Entry shim so ``uvicorn main:app`` (Railpack FastAPI default) matches this repo layout."""

from app.main import app

__all__ = ["app"]
