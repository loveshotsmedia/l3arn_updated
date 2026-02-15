"""L3ARN — Tenant resolution from database.

Instead of relying solely on JWT claims for tenant context,
we query tenant_memberships to resolve (tenant_id, role) for the current user.
This is the canonical approach per ADR-0001 Decision #7.
"""

from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.settings import get_settings


@dataclass(frozen=True)
class TenantContext:
    """Resolved tenant context for the current request."""

    tenant_id: str
    role: str  # owner | admin | member
    user_id: str


async def resolve_tenant(user_id: str, tenant_id_hint: str | None = None) -> TenantContext:
    """Resolve tenant context by querying tenant_memberships.

    Strategy:
    1. If tenant_id_hint is provided (e.g. from header or JWT), verify membership.
    2. Otherwise, check profiles.default_tenant_id.
    3. Otherwise, use "first membership" rule.

    Uses Supabase service_role key to bypass RLS for this admin query.
    """
    settings = get_settings()
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        # If we have a hint, verify membership directly
        if tenant_id_hint:
            resp = await client.get(
                f"{settings.supabase_url}/rest/v1/tenant_memberships",
                headers=headers,
                params={
                    "select": "tenant_id,role",
                    "user_id": f"eq.{user_id}",
                    "tenant_id": f"eq.{tenant_id_hint}",
                    "limit": "1",
                },
            )
            resp.raise_for_status()
            rows = resp.json()
            if rows:
                return TenantContext(
                    tenant_id=rows[0]["tenant_id"],
                    role=rows[0]["role"],
                    user_id=user_id,
                )

        # Check default_tenant_id from profiles
        resp = await client.get(
            f"{settings.supabase_url}/rest/v1/profiles",
            headers=headers,
            params={
                "select": "default_tenant_id",
                "user_id": f"eq.{user_id}",
                "limit": "1",
            },
        )
        resp.raise_for_status()
        profiles = resp.json()
        default_tid = profiles[0].get("default_tenant_id") if profiles else None

        if default_tid:
            resp = await client.get(
                f"{settings.supabase_url}/rest/v1/tenant_memberships",
                headers=headers,
                params={
                    "select": "tenant_id,role",
                    "user_id": f"eq.{user_id}",
                    "tenant_id": f"eq.{default_tid}",
                    "limit": "1",
                },
            )
            resp.raise_for_status()
            rows = resp.json()
            if rows:
                return TenantContext(
                    tenant_id=rows[0]["tenant_id"],
                    role=rows[0]["role"],
                    user_id=user_id,
                )

        # Fallback: first membership
        resp = await client.get(
            f"{settings.supabase_url}/rest/v1/tenant_memberships",
            headers=headers,
            params={
                "select": "tenant_id,role",
                "user_id": f"eq.{user_id}",
                "order": "created_at.asc",
                "limit": "1",
            },
        )
        resp.raise_for_status()
        rows = resp.json()
        if rows:
            return TenantContext(
                tenant_id=rows[0]["tenant_id"],
                role=rows[0]["role"],
                user_id=user_id,
            )

    raise ValueError(f"User {user_id} has no tenant memberships")
