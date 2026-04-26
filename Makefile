.PHONY: dev dev-api dev-web db-migrate lint test install install-backend install-frontend

install: install-backend install-frontend

install-backend:
	cd backend && pip install -e ".[dev]"

install-frontend:
	cd frontend && pnpm install

dev:
	@echo "Run in two terminals: make dev-api   and   make dev-web"

db-migrate:
	cd backend && python3 -m alembic upgrade head

dev-api:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-web:
	cd frontend && pnpm dev

lint:
	cd backend && ruff check app tests && ruff format --check app tests
	cd frontend && pnpm lint

test:
	cd backend && pytest -q
	cd frontend && pnpm test

smoke-api:
	node scripts/check_external_links.mjs
