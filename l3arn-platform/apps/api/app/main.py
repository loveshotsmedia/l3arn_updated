"""L3ARN Platform — FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.middleware.logging import setup_logging
from app.middleware.trace_id import TraceIdMiddleware
from app.routers import health
from app.routers.v1 import router as v1_router
from app.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan — startup / shutdown hooks."""
    logger = structlog.get_logger()
    logger.info("l3arn_api.startup", env=settings.api_env)
    yield
    logger.info("l3arn_api.shutdown")


def create_app() -> FastAPI:
    """Factory that builds and configures the FastAPI application."""
    setup_logging(settings.api_log_level)

    application = FastAPI(
        title="L3ARN Platform API",
        version="0.1.0",
        description="Parent-led, student-driven learning platform backend.",
        lifespan=lifespan,
    )

    # ── CORS ─────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Trace‑ID middleware ──────────────────────────────────
    application.add_middleware(TraceIdMiddleware)

    # ── Routers ──────────────────────────────────────────────
    application.include_router(health.router)
    application.include_router(v1_router, prefix="/api/v1")

    return application


app = create_app()
