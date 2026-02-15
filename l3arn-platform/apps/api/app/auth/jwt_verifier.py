"""Supabase JWT verification — JWKS fetch, cache, and token validation."""

from __future__ import annotations

import time
from typing import Any

import httpx
import structlog
from jose import JWTError, jwk, jwt

from app.settings import settings

logger: Any = structlog.get_logger()

# ── JWKS Cache ───────────────────────────────────────────────
_jwks_cache: dict[str, Any] = {}
_jwks_cache_expiry: float = 0.0
_JWKS_CACHE_TTL: int = 3600  # 1 hour


async def _fetch_jwks() -> dict[str, Any]:
    """Fetch JWKS from Supabase and cache the result."""
    global _jwks_cache, _jwks_cache_expiry  # noqa: PLW0603

    now = time.time()
    if _jwks_cache and now < _jwks_cache_expiry:
        return _jwks_cache

    logger.info("jwks.fetch", url=settings.supabase_jwks_url)
    async with httpx.AsyncClient() as client:
        resp = await client.get(settings.supabase_jwks_url, timeout=10.0)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_cache_expiry = now + _JWKS_CACHE_TTL
        logger.info("jwks.cached", keys_count=len(_jwks_cache.get("keys", [])))
        return _jwks_cache


def _get_signing_key(jwks_data: dict[str, Any], token: str) -> Any:
    """Extract the correct signing key from JWKS for the given token."""
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")

    for key_data in jwks_data.get("keys", []):
        if key_data.get("kid") == kid:
            return jwk.construct(key_data)

    raise JWTError(f"No matching key found for kid={kid}")


class TokenPayload:
    """Parsed JWT payload with user and tenant context."""

    def __init__(self, payload: dict[str, Any]) -> None:
        self.sub: str = payload.get("sub", "")
        self.email: str = payload.get("email", "")
        self.role: str = payload.get("role", "")
        self.aud: str = payload.get("aud", "")
        self.exp: int = payload.get("exp", 0)
        self.raw: dict[str, Any] = payload

        # Tenant context — extracted from app_metadata or custom claims
        app_metadata = payload.get("app_metadata", {})
        self.tenant_id: str = app_metadata.get("tenant_id", "")

    @property
    def user_id(self) -> str:
        return self.sub


async def verify_jwt(token: str) -> TokenPayload:
    """
    Verify a Supabase JWT:
    1. Fetch/use cached JWKS
    2. Find the matching signing key
    3. Verify signature, expiry, audience, and issuer
    4. Return parsed TokenPayload
    """
    jwks_data = await _fetch_jwks()
    signing_key = _get_signing_key(jwks_data, token)

    try:
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256", "HS256"],
            audience="authenticated",
            options={
                "verify_exp": True,
                "verify_aud": True,
            },
        )
    except JWTError as e:
        logger.warning("jwt.verify_failed", error=str(e))
        raise

    logger.info("jwt.verified", sub=payload.get("sub"))
    return TokenPayload(payload)
