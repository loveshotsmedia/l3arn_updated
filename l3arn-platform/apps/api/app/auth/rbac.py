"""RBAC layer — role enforcement for tenant memberships."""

from __future__ import annotations

from enum import StrEnum
from typing import Any

import structlog
from fastapi import HTTPException, status

from app.auth.jwt_verifier import TokenPayload

logger: Any = structlog.get_logger()


class Role(StrEnum):
    """Tenant membership roles."""

    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


# Role hierarchy: owner > admin > member
_ROLE_HIERARCHY: dict[Role, int] = {
    Role.OWNER: 30,
    Role.ADMIN: 20,
    Role.MEMBER: 10,
}


def check_role(token: TokenPayload, required_role: Role) -> None:
    """
    Verify that the user's role meets or exceeds the required role.

    In production this should query tenant_memberships in the DB.
    For the foundation, it reads from JWT app_metadata.
    """
    user_role_str = token.raw.get("app_metadata", {}).get("role", "member")

    try:
        user_role = Role(user_role_str)
    except ValueError:
        logger.warning("rbac.unknown_role", role=user_role_str, user_id=token.user_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unknown role",
        )

    user_level = _ROLE_HIERARCHY.get(user_role, 0)
    required_level = _ROLE_HIERARCHY.get(required_role, 0)

    if user_level < required_level:
        logger.warning(
            "rbac.insufficient_role",
            user_id=token.user_id,
            user_role=user_role,
            required_role=required_role,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires role: {required_role.value}",
        )

    logger.info("rbac.authorized", user_id=token.user_id, role=user_role)
