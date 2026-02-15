"""
Example Tool — demonstrates the tool pattern with audit logging.

This tool:
1. Validates input against its JSON contract
2. Performs a sample operation (would write to DB in production)
3. Writes an audit log entry
"""

from __future__ import annotations

from typing import Any

import structlog

from app.agents.registry import register_tool
from app.auth.jwt_verifier import TokenPayload
from app.tools.base_tool import BaseTool

logger: Any = structlog.get_logger()


class ExampleTool(BaseTool):
    """Example tool that demonstrates the full tool lifecycle."""

    name = "example_tool"
    description = "A sample tool that logs an action and returns a result"
    contract_file = "example_tool.json"

    async def execute(
        self, payload: dict[str, Any], user: TokenPayload
    ) -> dict[str, Any]:
        """Execute the example tool."""
        message = payload.get("message", "Hello from ExampleTool")

        logger.info(
            "example_tool.execute",
            user_id=user.user_id,
            tenant_id=user.tenant_id,
            message=message,
        )

        # In production, this would perform a real DB operation
        # e.g., insert into audit_logs via Supabase client

        return {
            "success": True,
            "tool": self.name,
            "result": {
                "message": message,
                "echo": f"Processed by {self.name} for tenant {user.tenant_id}",
            },
        }


# Self-register on import
register_tool(
    name=ExampleTool.name,
    description=ExampleTool.description,
    handler_path="app.tools.example_tool.ExampleTool",
    contract_file="example_tool.json",
)
