# Fantasy Stocks Monorepo

Monorepo for the 3-week MVP:
- `apps/api`: FastAPI backend
- `apps/web`: Next.js frontend
- `infra`: Docker and environment setup
- `docs`: planning and architecture

## Quick start
1. Copy env files:
   - `cp .env.example .env`
   - `cp apps/api/.env.example apps/api/.env`
   - `cp apps/web/.env.local.example apps/web/.env.local`
2. Start Postgres/Redis: `docker compose up -d`
3. Backend setup: `make api-install && make api-dev`
4. Frontend setup: `make web-install && make web-dev`

## Day 1 done
- Monorepo scaffolded
- FastAPI app skeleton
- Initial SQLAlchemy models
- Alembic migration scaffold
- Next.js app scaffold
- Docker compose for Postgres/Redis
