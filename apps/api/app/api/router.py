from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.drafts import router as drafts_router
from app.api.health import router as health_router
from app.api.leagues import router as leagues_router
from app.api.matchups import router as matchups_router
from app.api.playoffs import router as playoffs_router
from app.api.roster import router as roster_router
from app.api.trades import router as trades_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(leagues_router)
api_router.include_router(drafts_router)
api_router.include_router(roster_router)
api_router.include_router(matchups_router)
api_router.include_router(trades_router)
api_router.include_router(playoffs_router)
