"use client";

/**
 * Parent Signup Page
 *
 * Email + password signup using Supabase Auth.
 * On success: redirects to /parent/onboarding/household.
 *
 * This is a Client Component because it handles form state and
 * Supabase auth calls which require browser APIs.
 *
 * After signup, Supabase creates an auth.users row. The DB trigger
 * handle_new_auth_user() fires to create the parent_accounts row.
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Redirect after email confirmation — handled by Supabase
          emailRedirectTo: `${window.location.origin}/parent/onboarding/household`,
        },
      });

      if (signUpError) throw signUpError;

      // On success, navigate to household onboarding.
      // Supabase may send a confirmation email depending on project settings.
      router.push("/parent/onboarding/household");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed. Please try again.");
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
        <h1 className="text-2xl font-bold mb-1">Create your parent account</h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
          You control your household. Your children's data belongs to you.
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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                background: "var(--color-bg)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
              }}
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{
                background: "var(--color-bg)",
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
              }}
              placeholder="Repeat your password"
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
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "var(--color-text-muted)" }}>
          Already have an account?{" "}
          <Link
            href="/parent/auth/login"
            className="font-semibold"
            style={{ color: "var(--color-primary)" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
