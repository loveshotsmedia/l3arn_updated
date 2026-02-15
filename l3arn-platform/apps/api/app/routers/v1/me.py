"""GET /v1/me — Return current user's profile + tenant context."""

from __future__ import annotations

from fastapi import APIRouter

from app.auth.dependencies import Ctx
from app.models.schemas import MeResponse

router = APIRouter()


@router.get("/me", response_model=MeResponse)
async def get_me(ctx: Ctx) -> MeResponse:
    """Return the authenticated user's profile with resolved tenant context."""
    return MeResponse(
        user_id=ctx.user_id,
        email=ctx.token.email,
        tenant_id=ctx.tenant_id,
        role=ctx.role,
        display_name=None,  # Can be enriched from profiles table
        avatar_url=None,
    )
