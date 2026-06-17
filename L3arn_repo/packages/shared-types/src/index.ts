/**
 * @l3arn/shared-types
 *
 * Zod schemas and inferred TypeScript types shared across all L3ARN services:
 * Vercel (Next.js frontend), Railway (realtime/API), Supabase, and the
 * L3ARN 3D World Engine.
 *
 * Import from this package, never directly from individual schema files.
 *
 * See: docs/shared_contracts_spec.md for the full specification.
 *
 * Dependency order (do not re-export schemas in a way that creates cycles):
 *
 *   identity.schema       ← root; no external deps
 *     ├── mission.schema  ← imports House, Grade, DeliveryMode, ApprovalMode
 *     ├── world-event.schema ← imports House
 *     ├── rewards.schema  ← imports House
 *     └── permissions.schema ← imports VisibilityTierSchema
 *   evidence.schema       ← string IDs only; no cross-schema imports
 *   parent-report.schema  ← string IDs only; no cross-schema imports
 *   moderation.schema     ← string IDs only; no cross-schema imports
 *   ai.schema             ← string IDs only; no cross-schema imports
 */

// ── Foundation contracts (load first; others may depend on these) ─────────────
export * from "./identity.schema";
export * from "./mission.schema";
export * from "./world-event.schema";

// ── Secondary contracts ───────────────────────────────────────────────────────
export * from "./evidence.schema";
export * from "./rewards.schema";
export * from "./parent-report.schema";

// ── Cross-cutting contracts ───────────────────────────────────────────────────
export * from "./permissions.schema";
export * from "./moderation.schema";
export * from "./ai.schema";
export * from "./calibration.schema";
