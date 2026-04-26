# Project Re-Paint — API

FastAPI service. Run locally:

```bash
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

Apply migrations:

```bash
alembic upgrade head
```
