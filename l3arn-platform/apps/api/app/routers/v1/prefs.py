"""Student preferences routes — /v1/students/{id}/prefs."""

from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, HTTPException

from app.auth.dependencies import Ctx
from app.models.schemas import (
    LearningPrefsResponse,
    LearningPrefsUpsert,
    SchedulePrefsResponse,
    SchedulePrefsUpsert,
)

logger: Any = structlog.get_logger()

router = APIRouter(prefix="/students/{student_id}/prefs")


@router.get("/learning", response_model=LearningPrefsResponse | None)
async def get_learning_prefs(student_id: str, ctx: Ctx) -> dict | None:
    """Fetch learning prefs for a student."""
    from app.agents.registry import get_registry

    registry = get_registry()
    tool = registry.get_tool("tool_upsert_learning_prefs")
    if not tool:
        raise HTTPException(status_code=501, detail="tool not registered")

    # Use as a read operation
    result = await tool.execute(
        input_data={
            "student_id": student_id,
            "tenant_id": ctx.tenant_id,
            "operation": "get",
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


@router.post("/learning", response_model=LearningPrefsResponse)
async def upsert_learning_prefs(
    student_id: str,
    body: LearningPrefsUpsert,
    ctx: Ctx,
) -> dict:
    """Create or update learning prefs for a student."""
    from app.agents.registry import get_registry

    registry = get_registry()
    tool = registry.get_tool("tool_upsert_learning_prefs")
    if not tool:
        raise HTTPException(status_code=501, detail="tool not registered")

    result = await tool.execute(
        input_data={
            "student_id": student_id,
            "tenant_id": ctx.tenant_id,
            "operation": "upsert",
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


@router.get("/schedule", response_model=SchedulePrefsResponse | None)
async def get_schedule_prefs(student_id: str, ctx: Ctx) -> dict | None:
    """Fetch schedule prefs for a student."""
    from app.agents.registry import get_registry

    registry = get_registry()
    tool = registry.get_tool("tool_upsert_schedule_prefs")
    if not tool:
        raise HTTPException(status_code=501, detail="tool not registered")

    result = await tool.execute(
        input_data={
            "student_id": student_id,
            "tenant_id": ctx.tenant_id,
            "operation": "get",
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


@router.post("/schedule", response_model=SchedulePrefsResponse)
async def upsert_schedule_prefs(
    student_id: str,
    body: SchedulePrefsUpsert,
    ctx: Ctx,
) -> dict:
    """Create or update schedule prefs for a student."""
    from app.agents.registry import get_registry

    registry = get_registry()
    tool = registry.get_tool("tool_upsert_schedule_prefs")
    if not tool:
        raise HTTPException(status_code=501, detail="tool not registered")

    result = await tool.execute(
        input_data={
            "student_id": student_id,
            "tenant_id": ctx.tenant_id,
            "operation": "upsert",
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
