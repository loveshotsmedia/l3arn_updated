"""Tests for the /health endpoint."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_200() -> None:
    """Health endpoint should return 200 with expected fields."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "l3arn-api"
    assert "version" in data


def test_health_includes_trace_id_header() -> None:
    """Responses should include X-Trace-Id header from middleware."""
    response = client.get("/health")
    assert "x-trace-id" in response.headers


def test_v1_ping_returns_200() -> None:
    """V1 ping endpoint should return 200."""
    response = client.get("/api/v1/ping")
    assert response.status_code == 200

    data = response.json()
    assert data["message"] == "pong"
    assert data["version"] == "v1"
