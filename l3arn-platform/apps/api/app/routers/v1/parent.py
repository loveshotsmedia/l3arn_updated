"""Parent profile routes — GET/POST /v1/parent/profile."""

from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, HTTPException

from app.auth.dependencies import Ctx
from app.models.schemas import ParentProfileCreate, ParentProfileResponse

logger: Any = structlog.get_logger()

router = APIRouter(prefix="/parent")


@router.get("/profile", response_model=ParentProfileResponse | None)
async def get_parent_profile(ctx: Ctx) -> dict | None:
    """Fetch the current parent's profile (prefill for onboarding).

    Delegates to tool_get_parent_profile for audit coverage.
    """
    from app.agents.registry import get_registry

    registry = get_registry()
    tool = registry.get_tool("tool_get_parent_profile")
    if not tool:
        raise HTTPException(status_code=501, detail="tool_get_parent_profile not registered")

    result = await tool.execute(
        input_data={"user_id": ctx.user_id, "tenant_id": ctx.tenant_id},
        ctx={
            "user_id": ctx.user_id,
            "tenant_id": ctx.tenant_id,
            "role": ctx.role,
            "trace_id": ctx.trace_id,
            "request_id": ctx.request_id,
        },
    )
    return result.output


@router.post("/profile", response_model=ParentProfileResponse)
async def save_parent_profile(
    body: ParentProfileCreate,
    ctx: Ctx,
) -> dict:
    """Create or update the parent's profile.

    Delegates to tool_save_parent_profile for audit coverage.
    """
    from app.agents.registry import get_registry

    registry = get_registry()
    tool = registry.get_tool("tool_save_parent_profile")
    if not tool:
        raise HTTPException(status_code=501, detail="tool_save_parent_profile not registered")

    result = await tool.execute(
        input_data={
            "user_id": ctx.user_id,
            "tenant_id": ctx.tenant_id,
            **body.model_dump(exclude_none=True),
        },
        ctx={
            "user_id": ctx.user_id,
            "tenant_id": ctx.tenant_id,
            "role": ctx.role,
            "trace_id": ctx.trace_id,
            "request_id": ctx.request_id,
        },
    )
    return result.output
