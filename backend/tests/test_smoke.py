def test_app_imports():
    from app.main import app

    assert app.title


def test_openapi_schema():
    from app.main import app

    schema = app.openapi()
    assert "openapi" in schema
    assert "/api/v1/health" in schema.get("paths", {})
