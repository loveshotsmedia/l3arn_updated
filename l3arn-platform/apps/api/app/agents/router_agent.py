"""
Router Agent — routes user intent to the appropriate tool.

This is the orchestration layer. It:
1. Receives a user intent (string or structured request)
2. Looks up the matching tool in the capabilities registry
3. Validates input against the tool's contract
4. Executes the tool
5. Returns the result with audit metadata
"""

from __future__ import annotations

from typing import Any

import structlog

from app.agents.registry import get_tool, list_tools
from app.auth.jwt_verifier import TokenPayload

logger: Any = structlog.get_logger()


class RouterAgent:
    """Routes intent to the correct tool using the capabilities registry."""

    async def route(
        self,
        intent: str,
        payload: dict[str, Any],
        user: TokenPayload,
    ) -> dict[str, Any]:
        """
        Route an intent to the matching tool and execute it.

        Args:
            intent: The tool name or intent identifier.
            payload: Input data for the tool.
            user: The authenticated user's token payload.

        Returns:
            Tool execution result with audit metadata.
        """
        logger.info(
            "router_agent.routing",
            intent=intent,
            user_id=user.user_id,
            tenant_id=user.tenant_id,
        )

        tool_entry = get_tool(intent)
        if not tool_entry:
            available = [t["name"] for t in list_tools()]
            logger.warning("router_agent.tool_not_found", intent=intent, available=available)
            return {
                "success": False,
                "error": f"Unknown tool: {intent}",
                "available_tools": available,
            }

        # In a full implementation, this would:
        # 1. Validate payload against tool_entry["contract"]
        # 2. Dynamically import and instantiate the tool handler
        # 3. Execute with audit logging
        # For now, return a structured acknowledgment
        logger.info("router_agent.dispatching", tool=intent)

        return {
            "success": True,
            "tool": intent,
            "message": f"Tool '{intent}' would be executed here",
            "payload_received": payload,
            "user_id": user.user_id,
            "tenant_id": user.tenant_id,
        }
