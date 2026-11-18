# Fantasy Stocks

An early prototype of fantasy football, but with stocks. People join a league, draft stocks, set a weekly lineup, and the scoring is based on how those stocks do.

I built it in February 2026 as a three-week MVP plan. It is a prototype, not a finished product, and I am not working on it anymore.

## What is in it

- `apps/api`: the backend, written in FastAPI (Python) with SQLAlchemy models and Alembic migrations.
- `apps/web`: the frontend, written in Next.js, set up as a mobile-friendly web app (PWA) with league screens.
- `infra`: Docker Compose for Postgres and Redis, plus environment setup.
- `docs`: my planning notes. `mvp_architecture.md` has the data model and the game rules I planned (a stock can only be drafted once per league, lineups lock on weekends, trades take effect the next Saturday). `mvp_3_week_execution_plan.md` has the day-by-day plan.

From the commit history, the backend has league and draft code, a draft room over WebSockets with a pick timer, and market search endpoints. Market data was planned to come from yfinance, which is 15 minutes delayed. I did not finish the full season, trade and playoff features from the plan.

## Running it

1. Copy the example env files:
   - `cp .env.example .env`
   - `cp apps/api/.env.example apps/api/.env`
   - `cp apps/web/.env.local.example apps/web/.env.local`
2. Start Postgres and Redis: `docker compose up -d`
3. Backend: `make api-install && make api-dev`
4. Frontend: `make web-install && make web-dev`

## Status

Prototype, last worked on in February 2026. It has not been tested lately, so expect to fix some things to get it running. `START_HERE.md` is my original kickoff note from the start of the project.

## Author

Sansar Karki, [github.com/Sansar-Karki](https://github.com/Sansar-Karki)
