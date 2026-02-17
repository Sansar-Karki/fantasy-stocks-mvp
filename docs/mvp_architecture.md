# MVP Architecture (Pragmatic)

## Services
- `apps/api` (FastAPI): business logic, auth, gameplay rules
- `apps/web` (Next.js): responsive web UI
- `postgres`: source of truth
- `redis` (optional but recommended): cache stock search and draft state

## Core entities
- User
- League
- LeagueMember
- Season
- Draft
- DraftPick
- TeamRoster
- RosterSlot
- MatchupWeek
- MatchupResult
- TradeProposal
- TradeItem
- StockSnapshot

## High-value API surface
- Auth: register/login/me
- League: create/join/get/list
- Draft: room state, pick, websocket events
- Roster: get roster, set active lineup
- Matchups: week view, standings
- Trades: create/respond/list
- Playoffs: bracket view

## Critical rule engine constraints
- Draft uniqueness: stock can only be picked once per league.
- Locking: lineup edits only during Saturday-Sunday window.
- Scoring: sum of active stock returns only.
- Trade effectivity: accepted trade applies next Saturday.

## Data flow for scoring
1. Monday close prices captured for active stocks.
2. Friday close prices captured for active stocks.
3. Return computed as `(friday_close - monday_close) / monday_close * 100`.
4. Team score = sum of 5 active returns.
5. Matchup winner updates standings.

## Testing priorities
- Unit tests for scoring and locking rules.
- Integration tests for draft and trade flows.
- One end-to-end test for complete mini-season simulation.
