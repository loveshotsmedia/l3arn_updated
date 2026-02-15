"""V1 API router — aggregates all /api/v1/* sub-routers."""

from __future__ import annotations

from fastapi import APIRouter

from app.routers.v1.me import router as me_router
from app.routers.v1.parent import router as parent_router
from app.routers.v1.students import router as students_router
from app.routers.v1.prefs import router as prefs_router
from app.routers.v1.companion import router as companion_router
from app.routers.v1.ai import router as ai_router

router = APIRouter()


@router.get("/ping")
async def ping() -> dict[str, str]:
    """Quick ping for the v1 namespace."""
    return {"message": "pong", "version": "v1"}


# Wire all sub-routers
router.include_router(me_router, tags=["me"])
router.include_router(parent_router, tags=["parent"])
router.include_router(students_router, tags=["students"])
router.include_router(prefs_router, tags=["preferences"])
router.include_router(companion_router, tags=["companion"])
router.include_router(ai_router, tags=["ai"])
