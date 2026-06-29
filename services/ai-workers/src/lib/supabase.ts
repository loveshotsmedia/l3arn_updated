/**
 * Supabase service-role client factory (shared).
 *
 * Service_role bypasses RLS. Every read/write performed with this client is a
 * trusted, server-side, audited action. NEVER expose the service-role key to the
 * browser and NEVER construct this client in client-bundled code.
 *
 * Centralized here so all Railway routes share one construction + one set of
 * guard rails. (The legacy inline copy in sessions.route.ts predates this; new
 * code should import from here.)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Build a service-role Supabase client from Railway env vars.
 * Throws if either env var is missing — callers must translate this into a
 * 503 (service misconfigured), never a silent failure.
 */
export function getSupabaseServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "[ai-workers] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "Set both in Railway environment variables.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
