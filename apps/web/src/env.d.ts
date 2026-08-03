/**
 * Environment variable type declarations for L3ARN Next.js web app.
 *
 * NEXT_PUBLIC_* variables are exposed to the browser.
 * Variables without NEXT_PUBLIC_ prefix are server-only.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    // Supabase — required for auth and data access
    readonly NEXT_PUBLIC_SUPABASE_URL: string;
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string;

    // Railway API — backend for missions, sessions, AI, reports
    readonly NEXT_PUBLIC_RAILWAY_API_URL: string;

    // Build environment
    readonly NODE_ENV: "development" | "production" | "test";
  }
}
