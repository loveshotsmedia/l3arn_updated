"""Trace-ID middleware — injects a unique trace_id into every request."""

from __future__ import annotations

import uuid
from typing import Any

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class TraceIdMiddleware(BaseHTTPMiddleware):
    """
    Generates or forwards an ``X-Trace-Id`` header on every request.

    The trace_id is bound to the structlog context so every log line
    emitted during the request includes it automatically.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        trace_id = request.headers.get("x-trace-id", str(uuid.uuid4()))
        request_id = str(uuid.uuid4())

        # Bind to structlog context for the duration of this request
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            trace_id=trace_id,
            request_id=request_id,
            method=request.method,
            path=str(request.url.path),
        )

        logger: Any = structlog.get_logger()
        logger.info("request.start")

        response: Response = await call_next(request)

        response.headers["X-Trace-Id"] = trace_id
        response.headers["X-Request-Id"] = request_id

        logger.info("request.end", status_code=response.status_code)
        return response
