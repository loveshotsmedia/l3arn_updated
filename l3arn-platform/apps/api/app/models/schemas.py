"""Pydantic models for API request/response schemas."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────


class MembershipRole(StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


# ── Tenant ───────────────────────────────────────────────────


class TenantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100)


class TenantCreate(TenantBase):
    pass


class TenantResponse(TenantBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


# ── Profile ──────────────────────────────────────────────────


class ProfileBase(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None


class ProfileResponse(ProfileBase):
    id: UUID
    user_id: UUID
    tenant_id: UUID
    created_at: datetime


# ── Membership ───────────────────────────────────────────────


class MembershipResponse(BaseModel):
    id: UUID
    user_id: UUID
    tenant_id: UUID
    role: MembershipRole
    created_at: datetime


# ── Audit Log ────────────────────────────────────────────────


class AuditLogEntry(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    action: str
    resource_type: str
    resource_id: str | None = None
    metadata: dict | None = None
    trace_id: str
    request_id: str
    created_at: datetime


# ── Webhook Events ───────────────────────────────────────────


class WebhookEventResponse(BaseModel):
    id: UUID
    tenant_id: UUID | None = None
    source: str
    event_type: str
    payload: dict
    signature_valid: bool
    processed: bool
    created_at: datetime


# ── Parent Profile ───────────────────────────────────────────


class ParentProfileBase(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    email: str | None = None
    city: str | None = None
    state: str | None = None
    country: str = "US"
    timezone: str = "America/New_York"
    metadata: dict | None = None


class ParentProfileCreate(ParentProfileBase):
    pass


class ParentProfileResponse(ParentProfileBase):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime


# ── Onboarding Status ───────────────────────────────────────


class OnboardingStatusResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    current_step: str
    steps_completed: list[str]
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class OnboardingStatusUpdate(BaseModel):
    current_step: str
    steps_completed: list[str] | None = None


# ── Student ──────────────────────────────────────────────────


class StudentBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str | None = None
    nickname: str | None = None
    date_of_birth: str | None = None  # ISO date string
    grade_level: str | None = None
    avatar_url: str | None = None
    metadata: dict | None = None


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    nickname: str | None = None
    date_of_birth: str | None = None
    grade_level: str | None = None
    avatar_url: str | None = None
    metadata: dict | None = None
    active: bool | None = None


class StudentResponse(StudentBase):
    id: UUID
    tenant_id: UUID
    parent_user_id: UUID
    active: bool
    created_at: datetime
    updated_at: datetime


# ── Learning Prefs ───────────────────────────────────────────


class LearningPrefsBase(BaseModel):
    learning_style: str | None = None
    interests: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    challenges: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    weekly_target_minutes: int = 300
    notes: str | None = None


class LearningPrefsUpsert(LearningPrefsBase):
    pass


class LearningPrefsResponse(LearningPrefsBase):
    id: UUID
    tenant_id: UUID
    student_id: UUID
    created_at: datetime
    updated_at: datetime


# ── Schedule Prefs ───────────────────────────────────────────


class SchedulePrefsBase(BaseModel):
    preferred_days: list[str] = Field(default_factory=list)
    preferred_times: dict = Field(default_factory=dict)
    session_duration_minutes: int = 45
    breaks_between: int = 10
    blackout_dates: list[str] = Field(default_factory=list)
    notes: str | None = None


class SchedulePrefsUpsert(SchedulePrefsBase):
    pass


class SchedulePrefsResponse(SchedulePrefsBase):
    id: UUID
    tenant_id: UUID
    student_id: UUID
    created_at: datetime
    updated_at: datetime


# ── Companion Config ─────────────────────────────────────────


class CompanionConfigBase(BaseModel):
    character_name: str | None = None
    character_style: str | None = None
    teaching_tone: str = "encouraging"
    reinforcement_style: str = "positive"
    parent_seed: dict = Field(default_factory=dict)
    student_choice: dict = Field(default_factory=dict)


class CompanionConfigUpsert(CompanionConfigBase):
    pass


class CompanionConfigResponse(CompanionConfigBase):
    id: UUID
    tenant_id: UUID
    student_id: UUID
    version: int
    active: bool
    created_at: datetime
    updated_at: datetime


# ── Tool Execution ───────────────────────────────────────────


class ToolExecutionEntry(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    tool_name: str
    tool_version: str | None = None
    input_payload: dict
    output_payload: dict | None = None
    success: bool
    error_message: str | None = None
    duration_ms: int | None = None
    trace_id: str
    request_id: str
    created_at: datetime


# ── AI Output ────────────────────────────────────────────────


class AiHelpRequest(BaseModel):
    """Input for the /v1/ai/help endpoint."""

    field_type: str = Field(..., description="Context of the field being helped (e.g. 'learning_goal', 'bio')")
    user_text: str = Field(..., min_length=1)
    constraints: dict | None = None
    student_context: dict | None = None


class AiHelpResponse(BaseModel):
    """Output from the /v1/ai/help endpoint."""

    suggestions: list[str]
    rewritten: str | None = None
    tone_variants: dict[str, str] | None = None
    model_provider: str
    model_version: str


class AiOutputEntry(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    tool_execution_id: UUID | None = None
    model_provider: str
    model_version: str
    prompt_type: str
    prompt_metadata: dict | None = None
    output_text: str | None = None
    output_metadata: dict | None = None
    safety_flags: list[str] = Field(default_factory=list)
    token_usage: dict | None = None
    duration_ms: int | None = None
    trace_id: str
    created_at: datetime


# ── /v1/me Response ──────────────────────────────────────────


class MeResponse(BaseModel):
    """Response for GET /v1/me — profile + tenant context."""

    user_id: str
    email: str | None = None
    tenant_id: str
    role: str
    display_name: str | None = None
    avatar_url: str | None = None
