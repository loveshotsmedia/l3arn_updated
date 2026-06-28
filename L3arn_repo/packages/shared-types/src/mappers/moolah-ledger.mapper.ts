/**
 * Moolah Ledger Mapper
 *
 * Usage:
 *   Import this mapper in any service that writes to or reads from
 *   the moolah_ledger table. Canonical insertion points:
 *
 *   - apps/api/src/routes/rewards/moolah.ts (Railway API reward endpoint)
 *   - apps/api/src/workers/mission-complete.worker.ts (effort + mastery reward dispatch)
 *   - packages/mission-compiler/src/rewards/mission-001-reward-rules.ts
 *     (when reward rules are hydrated into actual DB inserts)
 *
 * Key mismatches resolved here (Patch 3):
 *   - Zod `delta`         → DB `amount`
 *   - Zod `reason`        → DB `source_type`
 *   - Zod `referenceId`   → DB `source_id`
 *   - Zod `idempotencyKey`→ DB `idempotency_key`
 *   - Zod `walletId`      → DB `wallet_id`
 *   - Zod `childProfileId`→ DB `child_profile_id`
 *   - Zod `occurredAt`    → DB `created_at` (DB column; pass-through on read only)
 *   - DB `reason`         → human-readable string (no Zod equivalent; caller must supply)
 *   - DB `balance_after`  → set by trigger; never set by caller on INSERT
 *
 * Grounded in:
 *   Migration 004 (infra/supabase/migrations/004_rewards_moolah_companion.sql)
 *   rewards.schema.ts (MoolahLedgerEntrySchema)
 *   ADR-011 (reward economy)
 */

import type { MoolahLedgerEntry, MoolahReason } from "../rewards.schema";

// ─── DB Types ─────────────────────────────────────────────────────────────────

/**
 * Shape for INSERT into public.moolah_ledger.
 * Column names match the DB exactly (snake_case).
 *
 * Notes:
 *   - `balance_after` is set by the update_moolah_wallet_balance() trigger — omit on insert.
 *   - `reason` is a human-readable description (e.g. "Mission 001 completion").
 *     It is separate from `source_type`, which is the machine-readable category.
 *   - `idempotency_key` is optional; when provided, the DB UNIQUE constraint prevents
 *     duplicate reward events.
 */
export interface MoolahLedgerDbInsert {
  child_profile_id: string;
  wallet_id?: string;
  amount: number;          // was 'delta' in Zod — positive = earned, negative = spent
  source_type: string;     // was 'reason' (MoolahReasonSchema) in Zod
  source_id?: string;      // was 'referenceId' in Zod
  reason: string;          // human-readable description; no Zod equivalent — caller provides
  // balance_after is intentionally absent: set by the update_moolah_wallet_balance() trigger
  idempotency_key?: string; // was 'idempotencyKey' in Zod
}

/**
 * Shape of a row returned from SELECT on public.moolah_ledger.
 * Includes columns written by the DB (id, balance_after, created_at).
 */
export interface MoolahLedgerDbRow {
  id: string;
  child_profile_id: string;
  wallet_id: string | null;
  amount: number;
  source_type: string;
  source_id: string | null;
  reason: string;
  balance_after: number | null;
  idempotency_key: string | null;
  created_at: string;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

/**
 * Maps a domain MoolahLedgerEntry (Zod shape) to a DB insert shape.
 *
 * @param entry - The Zod-validated domain object.
 * @param humanReason - Human-readable description for the DB `reason` column
 *   (e.g. "Mission 001 effort reward"). This is required because the Zod schema
 *   does not carry a human-readable reason — it stores the machine-readable enum.
 *
 * Usage example:
 *   const dbInsert = moolahLedgerEntryToDb(entry, "Mission 001 completion reward");
 *   await supabase.from("moolah_ledger").insert(dbInsert);
 */
export function moolahLedgerEntryToDb(
  entry: MoolahLedgerEntry,
  humanReason: string,
): MoolahLedgerDbInsert {
  return {
    child_profile_id: entry.childProfileId,
    wallet_id: entry.walletId,
    amount: entry.delta,                    // Zod: delta → DB: amount
    source_type: entry.reason,              // Zod: reason (enum) → DB: source_type
    source_id: entry.referenceId,           // Zod: referenceId → DB: source_id
    reason: humanReason,                    // DB: reason (human-readable, no Zod equivalent)
    idempotency_key: entry.idempotencyKey,  // Zod: idempotencyKey → DB: idempotency_key
    // balance_after: intentionally omitted — set by trigger
  };
}

/**
 * Maps a DB moolah_ledger row back to a domain MoolahLedgerEntry.
 *
 * Note: DB `reason` (human-readable) has no field in MoolahLedgerEntry and is dropped.
 * Note: DB `created_at` maps to domain `occurredAt`.
 *
 * Usage example:
 *   const { data } = await supabase.from("moolah_ledger").select("*").eq("id", id);
 *   const entry = dbRowToMoolahLedgerEntry(data[0]);
 */
export function dbRowToMoolahLedgerEntry(row: MoolahLedgerDbRow): MoolahLedgerEntry {
  if (!row.wallet_id) {
    throw new Error(
      `moolah_ledger row ${row.id} has no wallet_id — row is inconsistent. ` +
      `Ensure the auto_create_moolah_wallet trigger ran before the ledger insert.`,
    );
  }
  return {
    id: row.id,
    childProfileId: row.child_profile_id,
    walletId: row.wallet_id,
    delta: row.amount,                           // DB: amount → Zod: delta
    reason: row.source_type as MoolahReason,     // DB: source_type → Zod: reason (enum)
    referenceId: row.source_id ?? undefined,     // DB: source_id → Zod: referenceId
    idempotencyKey: row.idempotency_key ?? undefined, // DB: idempotency_key → Zod: idempotencyKey
    occurredAt: row.created_at,                  // DB: created_at → Zod: occurredAt
  };
}
