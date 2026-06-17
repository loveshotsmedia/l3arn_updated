"use client";

/**
 * Parent Login Page
 *
 * Email + password sign-in using Supabase Auth.
 * On success: redirects to /parent/dashboard.
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      router.push("/parent/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center p-4">
      <div
        className="w-full max-w-md rounded-xl border p-8"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <h1 className="text-2xl font-bold mb-1">Sign in to L3ARN</h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
          Your household, your controls.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                background: "var(--color-bg)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                background: "var(--color-bg)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
              }}
              placeholder="Your password"
            />
          </div>

          {error && (
            <p className="rounded-lg px-4 py-2.5 text-sm bg-red-900/30 text-red-300 border border-red-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: "var(--color-primary)" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "var(--color-text-muted)" }}>
          Need an account?{" "}
          <Link
            href="/parent/auth/signup"
            className="font-semibold"
            style={{ color: "var(--color-primary)" }}
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
