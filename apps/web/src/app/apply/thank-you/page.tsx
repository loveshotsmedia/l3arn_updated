import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Received — L3ARN Founding Family Beta",
  description:
    "Your L3ARN Founding Family Beta application has been received. We'll be in touch.",
};

interface ThankYouPageProps {
  searchParams: Promise<{ name?: string }>;
}

export default async function ThankYouPage({ searchParams }: ThankYouPageProps) {
  // first_name is passed as a URL query param from the Server Action redirect.
  // We sanitize by only displaying it if it's a non-empty string.
  const resolvedSearchParams = await searchParams;
  const rawName = resolvedSearchParams.name ?? "";
  const firstName =
    rawName.trim().length > 0 && rawName.trim().length <= 100
      ? rawName.trim()
      : null;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        backgroundColor: "#f8f7f4",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "560px",
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "3rem 2.5rem",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        {/* Confirmation heading */}
        <div
          aria-hidden="true"
          style={{ fontSize: "3rem", marginBottom: "1rem" }}
        >
          &#x2713;
        </div>

        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "#1a1a2e",
            marginBottom: "1rem",
            lineHeight: 1.3,
          }}
        >
          {firstName
            ? `Thank you, ${firstName}! Your application is in.`
            : "Thank you! Your application is in."}
        </h1>

        <p
          style={{
            fontSize: "1.05rem",
            color: "#4a4a6a",
            lineHeight: 1.7,
            marginBottom: "1.5rem",
          }}
        >
          We review every application personally. Founding families will hear
          from us within 2 weeks.
        </p>

        <p
          style={{
            fontSize: "0.95rem",
            color: "#6b6b8a",
            lineHeight: 1.6,
            marginBottom: "2rem",
          }}
        >
          Founding Family Beta opens to 100 families. We are currently
          accepting applications.
        </p>

        {/* Community / next-step link — placeholder until channel confirmed */}
        <p
          style={{
            fontSize: "0.9rem",
            color: "#6b6b8a",
            marginBottom: "2rem",
          }}
        >
          {/*
            TODO (Agent 12 / OQ-GTM-001):
            Insert confirmed community link here once Discord or email list
            is set up. Do not add a placeholder URL that leads nowhere.
          */}
          In the meantime, keep an eye on your inbox for updates.
        </p>

        {/* Back to home */}
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.75rem",
            backgroundColor: "#f0efea",
            color: "#1a1a2e",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
            transition: "background-color 0.2s",
          }}
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
