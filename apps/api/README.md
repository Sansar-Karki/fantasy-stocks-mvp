# API (FastAPI)

## Setup
1. `python3 -m venv .venv`
2. `. .venv/bin/activate`
3. `pip install --upgrade pip`
4. `pip install -e .[dev]`
5. `cp .env.example .env`
6. `uvicorn app.main:app --reload --port 8000`

## Migrations
- `alembic upgrade head`
- `alembic revision --autogenerate -m "message"`
