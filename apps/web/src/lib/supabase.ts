/**
 * Supabase browser client helper for L3ARN Next.js app.
 *
 * Uses @supabase/ssr for proper cookie-based auth in Next.js App Router.
 * This file creates a browser (client-side) Supabase client.
 * Import this only from Client Components ("use client" pages/components).
 *
 * For server-side access (Server Components, Route Handlers), use
 * supabase-server.ts instead.
 *
 * The parent browser holds a Supabase JWT scoped to their own household.
 * Child sessions are backend-mediated through Railway (see RLS plan).
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Returns a singleton Supabase browser client.
 * Safe to call from Client Components and event handlers.
 */
export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn(
      "[L3ARN] Missing Supabase env vars. Auth will not work until " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
  }

  browserClient = createBrowserClient(url ?? "", anonKey ?? "");
  return browserClient;
}
