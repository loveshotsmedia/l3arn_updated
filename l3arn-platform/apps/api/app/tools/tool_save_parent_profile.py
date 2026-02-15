"""Tool: save parent profile (upsert + audit)."""

from __future__ import annotations

from app.tools.base_tool import BaseTool, ToolResult


class ToolSaveParentProfile(BaseTool):
    """Creates or updates the parent profile for a user in a tenant.

    Uses upsert on (user_id, tenant_id) unique constraint.
    """

    name = "tool_save_parent_profile"
    version = "1.0.0"
    description = "Create or update a parent profile (upsert)"

    async def _execute(self, input_data: dict, ctx: dict) -> ToolResult:
        """Upsert parent_profiles via Supabase service role."""
        from app.settings import get_settings
        import httpx

        settings = get_settings()
        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation,resolution=merge-duplicates",
        }

        # Extract profile fields
        profile_data = {
            "user_id": input_data["user_id"],
            "tenant_id": input_data["tenant_id"],
        }
        for field in [
            "first_name", "last_name", "phone", "email",
            "city", "state", "country", "timezone", "metadata",
        ]:
            if field in input_data:
                profile_data[field] = input_data[field]

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.supabase_url}/rest/v1/parent_profiles",
                headers=headers,
                json=profile_data,
            )
            resp.raise_for_status()
            rows = resp.json()

        return ToolResult(success=True, output=rows[0] if rows else profile_data)
