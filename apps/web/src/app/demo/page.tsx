import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "See L3ARN in Action — Hero Slice Demo",
  description:
    "Watch a preview of L3ARN's AI-powered homeschool OS. Apply now to be a Founding Family.",
};

/**
 * Demo shell page — Task 5 (Agent 12)
 *
 * This is a placeholder for the Hero Slice demo video/interactive demo.
 * Rules enforced here:
 * - No live product components embedded (no R3F, no world engine, no child data)
 * - No external <iframe> until demo video URL is confirmed
 * - CTA links to /apply
 *
 * TODO (Agent 12 / OQ-GTM-002):
 * Embed Hero Slice demo video when the 2–4 minute produced asset is ready.
 * See ADR-037 (demo-assets) for the sequencing: landing page + Hero Slice demo
 * video must both be present before the paid-acquisition funnel opens.
 *
 * <!-- TODO: embed Hero Slice demo video when produced -->
 */
export default function DemoPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        backgroundColor: "#1a1a2e",
        fontFamily: "system-ui, sans-serif",
        color: "#ffffff",
      }}
    >
      {/* Back to home */}
      <div
        style={{
          position: "absolute",
          top: "1.5rem",
          left: "1.5rem",
        }}
      >
        <Link
          href="/"
          style={{
            color: "rgba(255,255,255,0.7)",
            textDecoration: "none",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          &#8592; Back to home
        </Link>
      </div>

      <div
        style={{
          maxWidth: "680px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "0.9rem",
            color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: "1rem",
          }}
        >
          Hero Slice Demo
        </p>

        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: "1.5rem",
          }}
        >
          Watch L3ARN in Action
        </h1>

        <p
          style={{
            fontSize: "1.1rem",
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.7,
            marginBottom: "2.5rem",
          }}
        >
          The interactive demo is coming soon. We are putting the finishing
          touches on the Hero Slice — a full walkthrough of the parent setup,
          child entry, first mission, and learning report.
        </p>

        {/*
          Demo video placeholder.
          TODO (Agent 12 / OQ-GTM-002): Replace this block with the produced
          Hero Slice demo video once the asset is ready and the hosting URL is
          confirmed. Use a <video> tag or a confirmed third-party embed.
          Do NOT add a placeholder <iframe> with an unconfirmed URL.
          See ADR-037 (demo-assets) for sequencing requirements.
        */}
        <div
          aria-label="Demo video placeholder — coming soon"
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: "12px",
            border: "1px dashed rgba(255,255,255,0.2)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "2.5rem",
            gap: "0.75rem",
          }}
        >
          <div style={{ fontSize: "2.5rem", opacity: 0.3 }}>&#9654;</div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>
            Demo video coming soon
          </p>
        </div>

        {/* CTA */}
        <p
          style={{
            fontSize: "1rem",
            color: "rgba(255,255,255,0.7)",
            marginBottom: "1.25rem",
          }}
        >
          Apply now to be a Founding Family and see the product first.
        </p>

        <Link
          href="/apply"
          style={{
            display: "inline-block",
            padding: "1rem 2.25rem",
            backgroundColor: "#4f6ef7",
            color: "#ffffff",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "1rem",
          }}
        >
          Apply for Founding Family Beta
        </Link>
      </div>
    </main>
  );
}
