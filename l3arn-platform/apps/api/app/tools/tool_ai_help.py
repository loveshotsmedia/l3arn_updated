"""Tool: AI Help (Claude-backed text assistance + audit).

First AI tool. Uses Claude to generate:
- Suggestions for form fields
- Rewritten text
- Tone variants

MVP: returns placeholder output until Claude API key is configured.
Production: call Anthropic API with structured prompt.
"""

from __future__ import annotations

from app.tools.base_tool import BaseTool, ToolResult


class ToolAiHelp(BaseTool):
    """AI-powered text assistance using Claude.

    Logs prompt metadata + model + safety flags + output to ai_outputs.
    """

    name = "tool_ai_help"
    version = "1.0.0"
    description = "AI-powered text assistance (suggestions, rewriting, tone variants)"

    async def _execute(self, input_data: dict, ctx: dict) -> ToolResult:
        """Call Claude API (or return placeholder in MVP).

        In production, this would:
        1. Build a prompt from field_type + user_text + constraints + student_context
        2. Call Anthropic API
        3. Parse structured response
        4. Log to ai_outputs table
        5. Return suggestions + rewritten + tone_variants
        """
        field_type = input_data.get("field_type", "general")
        user_text = input_data.get("user_text", "")

        # MVP: placeholder response until Claude API is wired
        # TODO: Replace with actual Anthropic API call
        suggestions = [
            f"Consider expanding on: {user_text[:50]}...",
            f"Try focusing on specific {field_type} details",
            "Add measurable goals or timeframes",
        ]

        result = {
            "suggestions": suggestions,
            "rewritten": f"[AI-enhanced] {user_text}",
            "tone_variants": {
                "encouraging": f"Great start! {user_text}",
                "professional": f"The student demonstrates: {user_text}",
                "concise": user_text[:100] if len(user_text) > 100 else user_text,
            },
            "model_provider": "anthropic",
            "model_version": "claude-3-5-sonnet-placeholder",
        }

        # In production, also write to ai_outputs table here
        # await self._log_ai_output(ctx, input_data, result)

        return ToolResult(success=True, output=result)
