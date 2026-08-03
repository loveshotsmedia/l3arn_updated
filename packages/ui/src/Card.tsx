/**
 * Card — Shared UI Component
 *
 * A styled container with optional title, description, and padding.
 * Framework-agnostic; uses CSS custom properties.
 */

import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Remove default padding */
  noPadding?: boolean;
}

export function Card({ title, description, children, noPadding, style, ...rest }: CardProps) {
  return (
    <div
      style={{
        background: "var(--color-surface, #1a1d27)",
        border: "1px solid var(--color-border, #2d3148)",
        borderRadius: "var(--radius, 8px)",
        padding: noPadding ? "0" : "1.5rem",
        ...style,
      }}
      {...rest}
    >
      {(title || description) && (
        <div style={{ marginBottom: children ? "1rem" : 0 }}>
          {title && (
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--color-text, #e2e8f0)",
                margin: 0,
              }}
            >
              {title}
            </h3>
          )}
          {description && (
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-muted, #94a3b8)",
                marginTop: "0.25rem",
              }}
            >
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
