/**
 * Input — Shared UI Component
 *
 * Text input with label and error state support.
 * Uses CSS custom properties; framework-agnostic.
 */

import type { InputHTMLAttributes, ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  hint?: string;
  id: string;
}

export function Input({ label, error, hint, id, style, ...rest }: InputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--color-text, #e2e8f0)",
          }}
        >
          {label}
        </label>
      )}
      <input
        id={id}
        style={{
          padding: "0.625rem 1rem",
          borderRadius: "var(--radius, 8px)",
          border: `1px solid ${error ? "#f87171" : "var(--color-border, #2d3148)"}`,
          background: "var(--color-bg, #0f1117)",
          color: "var(--color-text, #e2e8f0)",
          fontSize: "0.875rem",
          fontFamily: "inherit",
          outline: "none",
          width: "100%",
          ...style,
        }}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          style={{ fontSize: "0.75rem", color: "#f87171" }}
        >
          {error}
        </p>
      )}
      {hint && !error && (
        <p
          id={`${id}-hint`}
          style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #94a3b8)" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
