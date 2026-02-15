"""
Capabilities Registry — central index of all registered tools and their contracts.

Tools register themselves here at import time. The registry provides:
- Discovery: list all available tools
- Lookup: find a tool by name (returns BaseTool instance)
- Contract validation: verify tool inputs match their JSON contracts

This is the single source of truth for what capabilities exist in the system.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING, Any

import structlog

if TYPE_CHECKING:
    from app.tools.base_tool import BaseTool

logger: Any = structlog.get_logger()

# ── Registry store ───────────────────────────────────────────

CONTRACTS_DIR = Path(__file__).parent.parent / "tools" / "contracts"


class ToolRegistry:
    """Singleton registry of tool instances + their metadata."""

    def __init__(self) -> None:
        self._tools: dict[str, BaseTool] = {}
        self._metadata: dict[str, dict[str, Any]] = {}

    def register(self, tool: BaseTool) -> None:
        """Register a tool instance.

        Also loads its JSON contract from contracts/ if it exists.
        """
        contract = None
        contract_path = CONTRACTS_DIR / f"{tool.name}.json"
        if contract_path.exists():
            with open(contract_path) as f:
                contract = json.load(f)
            logger.info("registry.contract_loaded", tool=tool.name)

        self._tools[tool.name] = tool
        self._metadata[tool.name] = {
            "name": tool.name,
            "version": getattr(tool, "version", "0.0.0"),
            "description": getattr(tool, "description", ""),
            "handler_path": f"{tool.__class__.__module__}.{tool.__class__.__name__}",
            "contract": contract,
        }
        logger.info("registry.tool_registered", tool=tool.name)

    def get_tool(self, name: str) -> BaseTool | None:
        """Look up a tool instance by name."""
        return self._tools.get(name)

    def list_tools(self) -> list[dict[str, Any]]:
        """Return metadata for all registered tools."""
        return list(self._metadata.values())

    def get_tool_contract(self, name: str) -> dict[str, Any] | None:
        """Return the JSON contract for a tool, if it exists."""
        meta = self._metadata.get(name)
        if meta:
            return meta.get("contract")
        return None


# ── Singleton ────────────────────────────────────────────────

_registry: ToolRegistry | None = None


def get_registry() -> ToolRegistry:
    """Get or initialize the global tool registry."""
    global _registry
    if _registry is None:
        _registry = ToolRegistry()
        _auto_register_tools(_registry)
    return _registry


def _auto_register_tools(registry: ToolRegistry) -> None:
    """Auto-import and register all MVP tools."""
    from app.tools.example_tool import ExampleTool
    from app.tools.tool_get_parent_profile import ToolGetParentProfile
    from app.tools.tool_save_parent_profile import ToolSaveParentProfile
    from app.tools.tool_get_students import ToolGetStudents
    from app.tools.tool_upsert_student import ToolUpsertStudent
    from app.tools.tool_upsert_learning_prefs import ToolUpsertLearningPrefs
    from app.tools.tool_upsert_schedule_prefs import ToolUpsertSchedulePrefs
    from app.tools.tool_ai_help import ToolAiHelp

    for tool_cls in [
        ExampleTool,
        ToolGetParentProfile,
        ToolSaveParentProfile,
        ToolGetStudents,
        ToolUpsertStudent,
        ToolUpsertLearningPrefs,
        ToolUpsertSchedulePrefs,
        ToolAiHelp,
    ]:
        registry.register(tool_cls())


# ── Backwards-compatible module-level functions ──────────────


def register_tool(
    name: str,
    description: str,
    handler_path: str,
    contract_file: str | None = None,
) -> None:
    """Legacy registration function — prefer get_registry().register()."""
    logger.warning("registry.legacy_register", tool=name, hint="Use get_registry().register()")


def list_tools() -> list[dict[str, Any]]:
    """List all registered tools."""
    return get_registry().list_tools()

