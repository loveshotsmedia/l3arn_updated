"""AI Help endpoint — POST /v1/ai/help.

First AI-powered endpoint. Uses Claude (via tool_ai_help) to provide:
- Suggestions for form fields
- Rewritten text
- Tone variants

Fully audited via tool_executions + ai_outputs tables.
"""

from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, HTTPException

from app.auth.dependencies import Ctx
from app.models.schemas import AiHelpRequest, AiHelpResponse

logger: Any = structlog.get_logger()

router = APIRouter(prefix="/ai")


@router.post("/help", response_model=AiHelpResponse)
async def ai_help(body: AiHelpRequest, ctx: Ctx) -> dict:
    """AI-powered text assistance.

    Input: field_type, user_text, optional constraints + student context.
    Output: suggestions, rewritten text, tone variants.
    Audit: logs prompt metadata + model + safety flags + output.
    """
    from app.agents.registry import get_registry

    registry = get_registry()
    tool = registry.get_tool("tool_ai_help")
    if not tool:
        raise HTTPException(status_code=501, detail="tool_ai_help not registered")

    result = await tool.execute(
        input_data=body.model_dump(),
        ctx={
            "user_id": ctx.user_id,
            "tenant_id": ctx.tenant_id,
            "role": ctx.role,
            "trace_id": ctx.trace_id,
            "request_id": ctx.request_id,
        },
    )
    return result.output
