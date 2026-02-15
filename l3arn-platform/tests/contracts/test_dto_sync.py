"""
Contract parity tests — validates that TS DTOs and Python models stay in sync.

This is a best-effort check that compares field names between:
- packages/shared-contracts/src/dto/*.ts (TypeScript zod schemas)
- apps/api/app/models/schemas.py (Python Pydantic models)

In a production setup, you'd generate one from the other or use JSON Schema
as the common format. For now, we do a structural comparison.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).parent.parent.parent


def extract_ts_fields(ts_file: Path) -> dict[str, list[str]]:
    """Extract field names from zod schemas in a TS file (best-effort regex)."""
    content = ts_file.read_text()
    schemas: dict[str, list[str]] = {}

    # Match patterns like: export const FooSchema = z.object({ ... })
    schema_pattern = r"export const (\w+Schema)\s*=\s*z\.object\(\{([^}]+)\}\)"
    for match in re.finditer(schema_pattern, content, re.DOTALL):
        name = match.group(1)
        body = match.group(2)
        # Extract field names
        fields = re.findall(r"(\w+)\s*:", body)
        schemas[name] = fields

    return schemas


def extract_py_fields(py_file: Path) -> dict[str, list[str]]:
    """Extract field names from Pydantic models (best-effort regex)."""
    content = py_file.read_text()
    models: dict[str, list[str]] = {}

    # Match class definitions and their fields
    class_pattern = r"class (\w+)\((?:BaseModel|.*Base)\):(.+?)(?=\nclass |\Z)"
    for match in re.finditer(class_pattern, content, re.DOTALL):
        name = match.group(1)
        body = match.group(2)
        # Extract field names (before the colon or = sign)
        fields = re.findall(r"^\s+(\w+)\s*[:=]", body, re.MULTILINE)
        # Filter out methods and private attrs
        fields = [f for f in fields if not f.startswith("_") and f != "model_config"]
        if fields:
            models[name] = fields

    return models


def test_tenant_dto_fields_match() -> None:
    """Tenant DTO fields should match between TS and Python."""
    ts_file = ROOT / "packages" / "shared-contracts" / "src" / "dto" / "tenant.ts"
    py_file = ROOT / "apps" / "api" / "app" / "models" / "schemas.py"

    if not ts_file.exists() or not py_file.exists():
        pytest.skip("DTO files not found")

    ts_schemas = extract_ts_fields(ts_file)
    py_models = extract_py_fields(py_file)

    # Compare TenantSchema fields with TenantResponse fields
    ts_fields = set(ts_schemas.get("TenantSchema", []))
    py_fields = set(py_models.get("TenantResponse", []))

    if ts_fields and py_fields:
        # Check that Python models have at least the TS fields
        missing = ts_fields - py_fields
        assert not missing, (
            f"Python TenantResponse is missing fields from TS TenantSchema: {missing}"
        )


def test_audit_log_dto_fields_match() -> None:
    """Audit log DTO fields should match between TS and Python."""
    ts_file = ROOT / "packages" / "shared-contracts" / "src" / "dto" / "audit.ts"
    py_file = ROOT / "apps" / "api" / "app" / "models" / "schemas.py"

    if not ts_file.exists() or not py_file.exists():
        pytest.skip("DTO files not found")

    ts_schemas = extract_ts_fields(ts_file)
    py_models = extract_py_fields(py_file)

    ts_fields = set(ts_schemas.get("AuditLogSchema", []))
    py_fields = set(py_models.get("AuditLogEntry", []))

    if ts_fields and py_fields:
        missing = ts_fields - py_fields
        assert not missing, (
            f"Python AuditLogEntry is missing fields from TS AuditLogSchema: {missing}"
        )
