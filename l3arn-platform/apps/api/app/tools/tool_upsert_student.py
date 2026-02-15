"""Tool: upsert student (create or update + audit)."""

from __future__ import annotations

from app.tools.base_tool import BaseTool, ToolResult


class ToolUpsertStudent(BaseTool):
    """Creates or updates a student record."""

    name = "tool_upsert_student"
    version = "1.0.0"
    description = "Create or update a student record in the current tenant"

    async def _execute(self, input_data: dict, ctx: dict) -> ToolResult:
        """Create or update student via Supabase service role."""
        from app.settings import get_settings
        import httpx

        settings = get_settings()
        operation = input_data.pop("operation", "create")

        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

        if operation == "create":
            student_data = {
                "tenant_id": input_data["tenant_id"],
                "parent_user_id": input_data["parent_user_id"],
            }
            for field in [
                "first_name", "last_name", "nickname",
                "date_of_birth", "grade_level", "avatar_url", "metadata",
            ]:
                if field in input_data:
                    student_data[field] = input_data[field]

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{settings.supabase_url}/rest/v1/students",
                    headers=headers,
                    json=student_data,
                )
                resp.raise_for_status()
                rows = resp.json()

            return ToolResult(success=True, output=rows[0] if rows else student_data)

        elif operation == "update":
            student_id = input_data.pop("student_id")
            update_data = {}
            for field in [
                "first_name", "last_name", "nickname",
                "date_of_birth", "grade_level", "avatar_url", "metadata", "active",
            ]:
                if field in input_data:
                    update_data[field] = input_data[field]

            async with httpx.AsyncClient() as client:
                resp = await client.patch(
                    f"{settings.supabase_url}/rest/v1/students",
                    headers={**headers, "Prefer": "return=representation"},
                    params={
                        "id": f"eq.{student_id}",
                        "tenant_id": f"eq.{input_data['tenant_id']}",
                    },
                    json=update_data,
                )
                resp.raise_for_status()
                rows = resp.json()

            return ToolResult(success=True, output=rows[0] if rows else update_data)

        return ToolResult(success=False, output=None, error=f"Unknown operation: {operation}")
