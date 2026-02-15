"""Student CRUD routes — /v1/students."""

from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, HTTPException

from app.auth.dependencies import Ctx
from app.models.schemas import StudentCreate, StudentResponse, StudentUpdate

logger: Any = structlog.get_logger()

router = APIRouter(prefix="/students")


@router.get("", response_model=list[StudentResponse])
async def list_students(ctx: Ctx) -> list[dict]:
    """List all students in the current tenant.

    Delegates to tool_get_students for audit coverage.
    """
    from app.agents.registry import get_registry

    registry = get_registry()
    tool = registry.get_tool("tool_get_students")
    if not tool:
        raise HTTPException(status_code=501, detail="tool_get_students not registered")

    result = await tool.execute(
        input_data={"tenant_id": ctx.tenant_id, "parent_user_id": ctx.user_id},
        ctx={
            "user_id": ctx.user_id,
            "tenant_id": ctx.tenant_id,
            "role": ctx.role,
            "trace_id": ctx.trace_id,
            "request_id": ctx.request_id,
        },
    )
    return result.output


@router.post("", response_model=StudentResponse, status_code=201)
async def create_student(body: StudentCreate, ctx: Ctx) -> dict:
    """Create a new student in the current tenant.

    Delegates to tool_upsert_student for audit coverage.
    """
    from app.agents.registry import get_registry

    registry = get_registry()
    tool = registry.get_tool("tool_upsert_student")
    if not tool:
        raise HTTPException(status_code=501, detail="tool_upsert_student not registered")

    result = await tool.execute(
        input_data={
            "tenant_id": ctx.tenant_id,
            "parent_user_id": ctx.user_id,
            "operation": "create",
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


@router.patch("/{student_id}", response_model=StudentResponse)
async def update_student(student_id: str, body: StudentUpdate, ctx: Ctx) -> dict:
    """Update an existing student.

    Delegates to tool_upsert_student for audit coverage.
    """
    from app.agents.registry import get_registry

    registry = get_registry()
    tool = registry.get_tool("tool_upsert_student")
    if not tool:
        raise HTTPException(status_code=501, detail="tool_upsert_student not registered")

    result = await tool.execute(
        input_data={
            "tenant_id": ctx.tenant_id,
            "parent_user_id": ctx.user_id,
            "student_id": student_id,
            "operation": "update",
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
