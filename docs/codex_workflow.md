# How We Work Together in Codex

## What you ask
Give me tasks as concrete slices, for example:
- "Create FastAPI auth routes with JWT and tests"
- "Add league create/join endpoints and DB migration"
- "Build draft board page connected to websocket"

## What I do
- Read current codebase.
- Implement changes directly in files.
- Run local checks/tests.
- Report exactly what changed and what to run next.

## Suggested command style
Use direct, actionable prompts:
1. "Scaffold backend app in `apps/api` using FastAPI + SQLAlchemy + Alembic."
2. "Create migration for user, league, league_member tables."
3. "Implement `POST /auth/register` and `POST /auth/login`."
4. "Write pytest coverage for auth success/failure."

## Best practice for fast progress
- Keep each request 1-2 features max.
- Ask for tests with each feature.
- Run app after each merged slice.
- Keep a strict "no new scope" rule until core loop is done.

## What to ask me next
"Scaffold the full monorepo now with:
- `apps/api` FastAPI project
- `apps/web` Next.js project
- docker-compose for Postgres
- Makefile with dev/test commands"
