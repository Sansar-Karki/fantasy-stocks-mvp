# Fantasy Stocks MVP - Start Here

This project is scoped to ship a working MVP in 3 weeks.

## Recommended stack (optimized for your background)
- Backend API: FastAPI (Python)
- Database: Postgres
- Realtime: WebSocket (FastAPI) for draft updates
- Frontend: Next.js (web app)
- Auth: JWT email/password (backend-managed)
- Market data: yfinance for MVP (15-minute delayed)

Why this stack:
- You can own backend logic in Python quickly.
- Codex can generate most of the frontend and Node wiring while you focus on product and finance logic.

## What was created
- `docs/mvp_3_week_execution_plan.md`: day-by-day build plan for 3 weeks.
- `docs/mvp_architecture.md`: data model + service boundaries + API surface.
- `docs/codex_workflow.md`: exactly how we collaborate in Codex each day.

## Immediate next actions (today)
1. Create backend skeleton (`apps/api`) and frontend skeleton (`apps/web`).
2. Implement Auth + League CRUD first.
3. Keep UI minimal; prioritize gameplay engine correctness.

If you want, next I can scaffold both apps and generate the initial database schema + first endpoints.
