/**
 * Button — Shared UI Component
 *
 * Variants: primary, secondary, danger
 * Supports: disabled state, loading state, full-width
 *
 * Uses CSS custom properties from globals.css so it works across
 * different page contexts without importing Tailwind.
 *
 * Note: This component is framework-agnostic (works in Next.js and Vite).
 * It does NOT use `"use client"` because it has no client-only APIs.
 * Consumers in Next.js should ensure their parent component is a Client
 * Component if they need interactivity.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "var(--color-primary, #6366f1)",
    color: "#fff",
    border: "1px solid transparent",
  },
  secondary: {
    background: "transparent",
    color: "var(--color-text, #e2e8f0)",
    border: "1px solid var(--color-border, #2d3148)",
  },
  danger: {
    background: "#dc2626",
    color: "#fff",
    border: "1px solid transparent",
  },
};

export function Button({
  variant = "primary",
  loading = false,
  fullWidth = false,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        padding: "0.625rem 1rem",
        borderRadius: "var(--radius, 8px)",
        fontSize: "0.875rem",
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.6 : 1,
        transition: "opacity 0.15s, background 0.15s",
        width: fullWidth ? "100%" : undefined,
        ...VARIANT_STYLES[variant],
        ...style,
      }}
      {...rest}
    >
      {loading ? "Loading…" : children}
    </button>
  );
}
