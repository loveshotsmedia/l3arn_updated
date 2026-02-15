"""Tests for JWT verification module."""

from __future__ import annotations

import pytest

from app.auth.jwt_verifier import TokenPayload


def test_token_payload_extracts_user_id() -> None:
    """TokenPayload should extract sub as user_id."""
    payload = {
        "sub": "user-123",
        "email": "test@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": 9999999999,
        "app_metadata": {
            "tenant_id": "tenant-456",
            "role": "owner",
        },
    }
    token = TokenPayload(payload)

    assert token.user_id == "user-123"
    assert token.sub == "user-123"
    assert token.email == "test@example.com"
    assert token.tenant_id == "tenant-456"


def test_token_payload_handles_missing_metadata() -> None:
    """TokenPayload should handle missing app_metadata gracefully."""
    payload = {
        "sub": "user-123",
        "email": "test@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": 9999999999,
    }
    token = TokenPayload(payload)

    assert token.user_id == "user-123"
    assert token.tenant_id == ""  # empty when no app_metadata


def test_token_payload_empty_sub() -> None:
    """TokenPayload with no sub should return empty string."""
    token = TokenPayload({})
    assert token.user_id == ""
    assert token.tenant_id == ""
