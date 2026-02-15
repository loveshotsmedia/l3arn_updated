"""Tool: get parent profile (read + audit)."""

from __future__ import annotations

from app.tools.base_tool import BaseTool, ToolResult


class ToolGetParentProfile(BaseTool):
    """Reads the parent profile for a given user + tenant.

    Logs the read operation to audit_logs for compliance.
    """

    name = "tool_get_parent_profile"
    version = "1.0.0"
    description = "Fetch parent profile for the current user in the current tenant"

    async def _execute(self, input_data: dict, ctx: dict) -> ToolResult:
        """Query parent_profiles via Supabase service role."""
        from app.settings import get_settings
        import httpx

        settings = get_settings()
        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
        }

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.supabase_url}/rest/v1/parent_profiles",
                headers=headers,
                params={
                    "select": "*",
                    "user_id": f"eq.{input_data['user_id']}",
                    "tenant_id": f"eq.{input_data['tenant_id']}",
                    "limit": "1",
                },
            )
            resp.raise_for_status()
            rows = resp.json()

        if rows:
            return ToolResult(success=True, output=rows[0])
        return ToolResult(success=True, output=None)
