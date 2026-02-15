"""Companion config routes — /v1/companion/{student_id}/config."""

from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, HTTPException

from app.auth.dependencies import Ctx
from app.models.schemas import CompanionConfigResponse, CompanionConfigUpsert

logger: Any = structlog.get_logger()

router = APIRouter(prefix="/companion/{student_id}")


@router.get("/config", response_model=CompanionConfigResponse | None)
async def get_companion_config(student_id: str, ctx: Ctx) -> dict | None:
    """Fetch companion config for a student."""
    from app.agents.registry import get_registry

    registry = get_registry()
    # Companion get/save can use a single tool or separate
    # For now, using direct Supabase query (read-only, low risk)
    # In production, delegate to a tool for audit coverage
    tool = registry.get_tool("tool_get_companion_config")

    if tool:
        result = await tool.execute(
            input_data={"student_id": student_id, "tenant_id": ctx.tenant_id},
            ctx={
                "user_id": ctx.user_id,
                "tenant_id": ctx.tenant_id,
                "role": ctx.role,
                "trace_id": ctx.trace_id,
                "request_id": ctx.request_id,
            },
        )
        return result.output

    # Placeholder: return None until tool is fully implemented
    logger.info("companion_config_get", student_id=student_id, status="no_tool_registered")
    return None


@router.post("/config", response_model=CompanionConfigResponse)
async def save_companion_config(
    student_id: str,
    body: CompanionConfigUpsert,
    ctx: Ctx,
) -> dict:
    """Save/update companion config for a student (parent seed)."""
    from app.agents.registry import get_registry

    registry = get_registry()
    tool = registry.get_tool("tool_save_companion_config")

    if not tool:
        raise HTTPException(status_code=501, detail="tool_save_companion_config not registered")

    result = await tool.execute(
        input_data={
            "student_id": student_id,
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
