"""
Base Tool — abstract base class for all L3ARN tools.

Every tool must:
1. Declare its name and contract
2. Validate inputs against the contract
3. Produce an audit log entry with trace_id
4. Return a structured result
"""

from __future__ import annotations

import abc
import json
from pathlib import Path
from typing import Any

import structlog

from app.auth.jwt_verifier import TokenPayload

logger: Any = structlog.get_logger()


class BaseTool(abc.ABC):
    """Abstract base for all platform tools."""

    # Subclasses must set these
    name: str = ""
    description: str = ""
    contract_file: str | None = None

    def __init__(self) -> None:
        self._contract: dict[str, Any] | None = None
        if self.contract_file:
            self._load_contract()

    def _load_contract(self) -> None:
        """Load the JSON contract for this tool."""
        contract_path = (
            Path(__file__).parent / "contracts" / (self.contract_file or "")
        )
        if contract_path.exists():
            with open(contract_path) as f:
                self._contract = json.load(f)

    def validate_input(self, payload: dict[str, Any]) -> list[str]:
        """
        Validate input payload against the tool's contract.

        Returns a list of validation errors (empty = valid).
        """
        errors: list[str] = []
        if not self._contract:
            return errors

        required_fields = self._contract.get("input", {}).get("required", [])
        for field in required_fields:
            if field not in payload:
                errors.append(f"Missing required field: {field}")

        return errors

    async def _write_audit_log(
        self,
        user: TokenPayload,
        action: str,
        payload: dict[str, Any],
        result: dict[str, Any],
    ) -> None:
        """Write an audit log entry for this tool execution."""
        logger.info(
            "tool.audit",
            tool=self.name,
            action=action,
            user_id=user.user_id,
            tenant_id=user.tenant_id,
            payload_keys=list(payload.keys()),
            success=result.get("success", False),
        )

    @abc.abstractmethod
    async def execute(
        self, payload: dict[str, Any], user: TokenPayload
    ) -> dict[str, Any]:
        """Execute the tool's core logic. Must be implemented by subclasses."""
        ...

    async def run(
        self, payload: dict[str, Any], user: TokenPayload
    ) -> dict[str, Any]:
        """
        Full tool execution pipeline:
        1. Validate input
        2. Execute core logic
        3. Write audit log
        4. Return result
        """
        # Validate
        errors = self.validate_input(payload)
        if errors:
            return {"success": False, "errors": errors}

        # Execute
        result = await self.execute(payload, user)

        # Audit
        await self._write_audit_log(user, "execute", payload, result)

        return result
