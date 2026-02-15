"""FastAPI dependency injection for auth + tenant context.

Provides:
- JWT verification
- DB-based tenant resolution
- RequestContext (user_id, tenant_id, role, trace_id)
- Role-gated dependencies
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Any

import structlog
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.auth.jwt_verifier import TokenPayload, verify_jwt
from app.auth.rbac import Role, check_role
from app.auth.tenant import TenantContext, resolve_tenant

logger: Any = structlog.get_logger()

_bearer_scheme = HTTPBearer(auto_error=True)


@dataclass(frozen=True)
class RequestContext:
    """Everything a handler needs: who, which tenant, what role, traceability."""

    user_id: str
    tenant_id: str
    role: str
    trace_id: str
    request_id: str
    token: TokenPayload


# ── Core dependencies ────────────────────────────────────────


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer_scheme)],
) -> TokenPayload:
    """Extract and verify the JWT from the Authorization header."""
    try:
        token_payload = await verify_jwt(credentials.credentials)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not token_payload.sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
        )

    return token_payload


async def get_request_context(
    request: Request,
    token: Annotated[TokenPayload, Depends(get_current_user)],
    x_tenant_id: str | None = Header(None),
) -> RequestContext:
    """Build full request context with DB-based tenant resolution.

    1. Verify JWT → get user_id
    2. Resolve tenant from DB (with optional tenant_id hint from header)
    3. Extract trace_id + request_id from middleware-injected state
    """
    # Resolve tenant from DB
    tenant_hint = x_tenant_id or token.tenant_id or None
    try:
        tenant_ctx: TenantContext = await resolve_tenant(
            user_id=token.user_id,
            tenant_id_hint=tenant_hint,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenant membership found for this user",
        )

    # Get trace/request IDs from middleware
    trace_id = getattr(request.state, "trace_id", "unknown")
    request_id = getattr(request.state, "request_id", "unknown")

    return RequestContext(
        user_id=token.user_id,
        tenant_id=tenant_ctx.tenant_id,
        role=tenant_ctx.role,
        trace_id=trace_id,
        request_id=request_id,
        token=token,
    )


# ── Role-gated dependencies ─────────────────────────────────


def require_role(role: Role):  # noqa: ANN201
    """Return a dependency that enforces a minimum role."""

    async def _checker(
        ctx: Annotated[RequestContext, Depends(get_request_context)],
    ) -> RequestContext:
        check_role(ctx.token, role)
        return ctx

    return _checker


# Convenience aliases
CurrentUser = Annotated[TokenPayload, Depends(get_current_user)]
Ctx = Annotated[RequestContext, Depends(get_request_context)]
RequireOwner = Annotated[RequestContext, Depends(require_role(Role.OWNER))]
RequireAdmin = Annotated[RequestContext, Depends(require_role(Role.ADMIN))]
RequireMember = Annotated[RequestContext, Depends(require_role(Role.MEMBER))]
