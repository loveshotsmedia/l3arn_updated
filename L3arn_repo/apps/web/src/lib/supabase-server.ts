/**
 * Supabase server client for Next.js Server Components and Route Handlers.
 *
 * IMPORTANT: This file must only be imported in Server Components,
 * Route Handlers, or Server Actions — never in Client Components.
 * The "use server" directive is not added here because this module
 * is imported, not used as a Server Action directly.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
