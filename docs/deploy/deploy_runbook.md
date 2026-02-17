# Deploy Runbook

## Targets
- API: Render (Blueprint via `render.yaml`)
- Web: Vercel (`apps/web`)

## 1) Deploy API (Render)
1. Push repo to GitHub.
2. In Render, create new Blueprint and select repo.
3. Render reads `/render.yaml` and creates `fantasy-stocks-api` service.
4. Set secret env vars in Render:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CORS_ORIGINS` (include Vercel domain)
5. Deploy and verify health endpoint:
   - `https://<api-domain>/api/health`

## 2) Run migrations in production
1. Open Render shell for API service.
2. Run:
   - `alembic upgrade head`

## 3) Deploy Web (Vercel)
1. Import repo into Vercel.
2. Set Root Directory to `apps/web`.
3. Add env var:
   - `NEXT_PUBLIC_API_BASE_URL=https://<api-domain>/api`
4. Deploy.

## 4) Post-deploy checks
1. Register and login from deployed web.
2. Create league and join from second account.
3. Run draft picks.
4. Check roster, trades, matchups, playoffs pages.
5. Confirm CORS by logging in from web domain.

## 5) Rollback strategy
- Vercel: rollback to previous deployment.
- Render: rollback to previous deploy.
- DB: only run additive migrations; avoid destructive migration in MVP window.
