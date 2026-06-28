/**
 * Supabase server client for Next.js Server Components and Route Handlers.
 *
 * IMPORTANT: This file must only be imported in Server Components,
 * Route Handlers, or Server Actions — never in Client Components.
 * The "use server" directive is not added here because this module
 * is imported, not used as a Server Action directly.
 */

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Standard server client for authenticated parent/guardian contexts.
 * Uses the anon key — RLS enforced per caller JWT.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

/**
 * Service-role Supabase client for Founder Mission Control admin views.
 *
 * SECURITY CONTRACT:
 *   - ONLY use this in Server Components, Route Handlers, or Server Actions.
 *   - NEVER import this in Client Components.
 *   - NEVER expose this client or its results to the browser unfiltered.
 *   - All admin queries that read child-adjacent data must strip PII before
 *     returning results to the UI layer.
 *   - Every write using this client must also write an audit record to audit_logs.
 *
 * Requires env var: SUPABASE_SERVICE_ROLE_KEY (server-only, never NEXT_PUBLIC_*)
 *
 * Grounded in: ADR-049 (admin access model), agent-11 spec Task 3.
 */
export function createSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!serviceRoleKey) {
    // Non-fatal in dev — throws in prod if actually queried
    console.warn(
      "[L3ARN][AdminClient] SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "Admin queries will fail. Set this env var in your .env.local file."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      // Service role clients do not use user sessions
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
