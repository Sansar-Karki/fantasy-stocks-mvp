.PHONY: api-install api-dev api-test api-lint web-install web-dev web-build infra-up infra-down

api-install:
	cd apps/api && python3 -m venv .venv && . .venv/bin/activate && pip install --upgrade pip && pip install -e .[dev]

api-dev:
	cd apps/api && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000

api-test:
	cd apps/api && . .venv/bin/activate && pytest

api-lint:
	cd apps/api && . .venv/bin/activate && ruff check .

web-install:
	cd apps/web && npm install

web-dev:
	cd apps/web && npm run dev

web-build:
	cd apps/web && npm run build

infra-up:
	docker compose up -d

infra-down:
	docker compose down
