"""Tool: get students (read + audit)."""

from __future__ import annotations

from app.tools.base_tool import BaseTool, ToolResult


class ToolGetStudents(BaseTool):
    """Reads all students for a parent in a tenant."""

    name = "tool_get_students"
    version = "1.0.0"
    description = "List students for the current parent in the current tenant"

    async def _execute(self, input_data: dict, ctx: dict) -> ToolResult:
        """Query students via Supabase service role."""
        from app.settings import get_settings
        import httpx

        settings = get_settings()
        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
        }

        params: dict[str, str] = {
            "select": "*",
            "tenant_id": f"eq.{input_data['tenant_id']}",
            "order": "created_at.asc",
        }

        # If not admin/owner, filter to parent's own students
        if ctx.get("role") not in ("owner", "admin"):
            params["parent_user_id"] = f"eq.{input_data['parent_user_id']}"

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.supabase_url}/rest/v1/students",
                headers=headers,
                params=params,
            )
            resp.raise_for_status()
            rows = resp.json()

        return ToolResult(success=True, output=rows)
