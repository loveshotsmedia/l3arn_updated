import { z } from 'zod';

// ── Student ─────────────────────────────────────────────────

export const StudentSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    parent_user_id: z.string().uuid(),
    first_name: z.string().min(1),
    last_name: z.string().nullable().optional(),
    nickname: z.string().nullable().optional(),
    date_of_birth: z.string().nullable().optional(),
    grade_level: z.string().nullable().optional(),
    avatar_url: z.string().url().nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
    active: z.boolean(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export type Student = z.infer<typeof StudentSchema>;

export const StudentCreateSchema = z.object({
    first_name: z.string().min(1).max(100),
    last_name: z.string().optional(),
    nickname: z.string().optional(),
    date_of_birth: z.string().optional(),
    grade_level: z.string().optional(),
    avatar_url: z.string().url().optional(),
    metadata: z.record(z.unknown()).optional(),
});

export type StudentCreate = z.infer<typeof StudentCreateSchema>;

// ── Learning Prefs ──────────────────────────────────────────

export const LearningPrefsSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    student_id: z.string().uuid(),
    learning_style: z.string().nullable().optional(),
    interests: z.array(z.string()).default([]),
    strengths: z.array(z.string()).default([]),
    challenges: z.array(z.string()).default([]),
    goals: z.array(z.string()).default([]),
    weekly_target_minutes: z.number().int().default(300),
    notes: z.string().nullable().optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export type LearningPrefs = z.infer<typeof LearningPrefsSchema>;

// ── Schedule Prefs ──────────────────────────────────────────

export const SchedulePrefsSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    student_id: z.string().uuid(),
    preferred_days: z.array(z.string()).default([]),
    preferred_times: z.record(z.unknown()).default({}),
    session_duration_minutes: z.number().int().default(45),
    breaks_between: z.number().int().default(10),
    blackout_dates: z.array(z.string()).default([]),
    notes: z.string().nullable().optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export type SchedulePrefs = z.infer<typeof SchedulePrefsSchema>;

// ── Companion Config ────────────────────────────────────────

export const CompanionConfigSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    student_id: z.string().uuid(),
    character_name: z.string().nullable().optional(),
    character_style: z.string().nullable().optional(),
    teaching_tone: z.string().default('encouraging'),
    reinforcement_style: z.string().default('positive'),
    parent_seed: z.record(z.unknown()).default({}),
    student_choice: z.record(z.unknown()).default({}),
    version: z.number().int(),
    active: z.boolean(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export type CompanionConfig = z.infer<typeof CompanionConfigSchema>;
