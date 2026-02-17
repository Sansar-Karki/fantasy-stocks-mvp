# 3-Week MVP Execution Plan

## Goal
Ship one complete private-league season loop:
- users sign up
- create/join league
- draft 8 stocks
- set lineups
- run weekly matchup scoring
- execute trades
- complete playoffs and crown winner

## Delivery strategy
- Week 1: Foundation + core data model + auth + leagues
- Week 2: Draft, roster lock rules, scoring engine
- Week 3: Trades, playoffs, hardening, deploy

## Week 1 (Days 1-7): Foundation

### Day 1
- Initialize monorepo structure: `apps/api`, `apps/web`, `infra/`, `docs/`.
- Stand up Postgres and local env.
- Define DB schema migrations.

### Day 2
- Implement auth endpoints:
  - `POST /auth/register`
  - `POST /auth/login`
  - `GET /me`
- Add JWT middleware.

### Day 3
- League APIs:
  - `POST /leagues`
  - `GET /leagues/:id`
  - `POST /leagues/:id/join`
- Invite code generation.

### Day 4
- Frontend auth pages + session handling.
- League create/join UI.

### Day 5
- Member management + league settings (MVP defaults mostly fixed).
- Basic standings table UI scaffold.

### Day 6
- Integrate yfinance adapter service.
- Stock search endpoint with caching.

### Day 7
- End-to-end pass: register -> create league -> join league.
- Bug fix + cleanup.

## Week 2 (Days 8-14): Gameplay Core

### Day 8
- Draft domain model and state machine.
- Endpoints for draft room, available stocks, pick submission.

### Day 9
- Real-time draft updates (WebSocket).
- Timer + turn expiration behavior.

### Day 10
- Frontend draft board + search + pick interaction.
- Enforce unique stock per league.

### Day 11
- Roster model: 5 active + 3 bench.
- Lineup change endpoint with lock windows.

### Day 12
- Weekly scoring job:
  - price snapshot Monday close
  - price snapshot Friday close
  - compute % returns and matchup scores

### Day 13
- Matchup and standings APIs + UI.
- Verify scoring against manual examples.

### Day 14
- Week 2 stabilization and test pass.

## Week 3 (Days 15-21): Completion + Launch

### Day 15
- Trade proposal endpoints:
  - create/accept/decline
  - effective Saturday

### Day 16
- Trade UI and validation rules (deadline, roster limits).

### Day 17
- Playoff seeding + bracket generation.
- Championship finalization.

### Day 18
- Admin essentials: kick inactive team, start/stop season.

### Day 19
- QA checklist pass + edge cases:
  - holiday weeks
  - halted/delisted stocks
  - missing price data

### Day 20
- Deployment setup + environment config + monitoring basics.

### Day 21
- Soft launch with 1-2 test leagues.
- Capture bugs and cut MVP release.

## Scope guardrails (must protect)
- No public leagues.
- No premium billing in MVP.
- No advanced analytics.
- No push notifications in v1 (in-app notifications later).

## Daily cadence with Codex
- Morning: define one feature slice.
- Build: ask Codex to generate files/endpoints/tests.
- Midday: run tests and fix failures.
- Evening: merge, update checklist, plan next slice.
