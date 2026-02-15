import { z } from 'zod';

// ── Parent Profile ──────────────────────────────────────────

export const ParentProfileSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    user_id: z.string().uuid(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    country: z.string().default('US'),
    timezone: z.string().default('America/New_York'),
    metadata: z.record(z.unknown()).nullable().optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export type ParentProfile = z.infer<typeof ParentProfileSchema>;

export const ParentProfileCreateSchema = z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().default('US'),
    timezone: z.string().default('America/New_York'),
    metadata: z.record(z.unknown()).optional(),
});

export type ParentProfileCreate = z.infer<typeof ParentProfileCreateSchema>;

// ── Onboarding Status ───────────────────────────────────────

export const OnboardingStatusSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    user_id: z.string().uuid(),
    current_step: z.string(),
    steps_completed: z.array(z.string()),
    completed_at: z.string().datetime().nullable().optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;
