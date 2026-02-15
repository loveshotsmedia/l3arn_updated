"""Tool: upsert learning preferences (get/upsert + audit)."""

from __future__ import annotations

from app.tools.base_tool import BaseTool, ToolResult


class ToolUpsertLearningPrefs(BaseTool):
    """Gets or upserts learning preferences for a student."""

    name = "tool_upsert_learning_prefs"
    version = "1.0.0"
    description = "Get or upsert learning preferences for a student"

    async def _execute(self, input_data: dict, ctx: dict) -> ToolResult:
        from app.settings import get_settings
        import httpx

        settings = get_settings()
        operation = input_data.pop("operation", "get")
        student_id = input_data["student_id"]
        tenant_id = input_data["tenant_id"]

        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        }

        if operation == "get":
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{settings.supabase_url}/rest/v1/child_learning_prefs",
                    headers=headers,
                    params={
                        "select": "*",
                        "student_id": f"eq.{student_id}",
                        "tenant_id": f"eq.{tenant_id}",
                        "limit": "1",
                    },
                )
                resp.raise_for_status()
                rows = resp.json()

            return ToolResult(success=True, output=rows[0] if rows else None)

        elif operation == "upsert":
            prefs_data = {
                "student_id": student_id,
                "tenant_id": tenant_id,
            }
            for field in [
                "learning_style", "interests", "strengths",
                "challenges", "goals", "weekly_target_minutes", "notes",
            ]:
                if field in input_data:
                    prefs_data[field] = input_data[field]

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{settings.supabase_url}/rest/v1/child_learning_prefs",
                    headers={**headers, "Prefer": "return=representation,resolution=merge-duplicates"},
                    json=prefs_data,
                )
                resp.raise_for_status()
                rows = resp.json()

            return ToolResult(success=True, output=rows[0] if rows else prefs_data)

        return ToolResult(success=False, output=None, error=f"Unknown operation: {operation}")
