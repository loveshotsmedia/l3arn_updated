/**
 * L3ARN Landing Page — Agent 12 Task 1
 *
 * React Server Component (no "use client" directive).
 * Rules enforced:
 * - No fake testimonials, fake names, or invented quotes
 * - No webcam/biometric features mentioned as available
 * - No <iframe> with external video (demo video not yet confirmed)
 * - No superiority claims — uses "designed to support mastery" / "standards-aware" language
 * - CTA links to /apply
 * - Page metadata set in this file via Next.js metadata export
 */

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "L3ARN — AI Homeschool OS for Families",
  description:
    "L3ARN helps parents run a personalized AI-powered homeschool while children learn through standards-aware missions inside a living 3D Academy. Apply for Founding Family Beta.",
  openGraph: {
    title: "L3ARN — AI Homeschool OS for Families",
    description:
      "Parents run a personalized AI-powered homeschool while children learn through standards-aware missions inside a living 3D Academy.",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Shared style tokens
// ---------------------------------------------------------------------------

const COLORS = {
  ink: "#1a1a2e",
  inkLight: "#4a4a6a",
  inkMuted: "#6b6b8a",
  accent: "#4f6ef7",
  accentLight: "#eef0fe",
  cream: "#f8f7f4",
  white: "#ffffff",
  border: "#e5e5f0",
};

const sectionBase: React.CSSProperties = {
  width: "100%",
  padding: "5rem 1.5rem",
};

const container: React.CSSProperties = {
  maxWidth: "1024px",
  margin: "0 auto",
};

// ---------------------------------------------------------------------------
// Section components (all server-renderable — no hooks, no client code)
// ---------------------------------------------------------------------------

function Nav() {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: COLORS.white,
        borderBottom: `1px solid ${COLORS.border}`,
        padding: "0 1.5rem",
      }}
    >
      <div
        style={{
          ...container,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "60px",
        }}
      >
        <span
          style={{
            fontWeight: 800,
            fontSize: "1.2rem",
            color: COLORS.ink,
            letterSpacing: "-0.02em",
          }}
        >
          L3ARN
        </span>
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
          <Link
            href="/demo"
            style={{
              color: COLORS.inkLight,
              textDecoration: "none",
              fontSize: "0.9rem",
            }}
          >
            Demo
          </Link>
          <Link
            href="/apply"
            style={{
              display: "inline-block",
              padding: "0.5rem 1.1rem",
              backgroundColor: COLORS.accent,
              color: COLORS.white,
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            Apply
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section
      style={{
        ...sectionBase,
        backgroundColor: COLORS.ink,
        color: COLORS.white,
        paddingTop: "6rem",
        paddingBottom: "6rem",
      }}
    >
      <div style={{ ...container, textAlign: "center" }}>
        <p
          style={{
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.55)",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            marginBottom: "1.25rem",
          }}
        >
          Founding Family Beta — Limited to 100 Families
        </p>

        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: "1.25rem",
            letterSpacing: "-0.02em",
          }}
        >
          An AI Homeschool OS.
          <br />
          For Your Family.
        </h1>

        <p
          style={{
            fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
            color: "rgba(255,255,255,0.78)",
            lineHeight: 1.7,
            maxWidth: "620px",
            margin: "0 auto 2.25rem",
          }}
        >
          L3ARN helps parents run a personalized AI-powered homeschool while
          children learn through standards-aware missions inside a living 3D
          Academy.
        </p>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/apply"
            style={{
              display: "inline-block",
              padding: "0.9rem 2rem",
              backgroundColor: COLORS.accent,
              color: COLORS.white,
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "1rem",
            }}
          >
            Apply for Founding Family Beta
          </Link>
          <Link
            href="/demo"
            style={{
              display: "inline-block",
              padding: "0.9rem 2rem",
              backgroundColor: "rgba(255,255,255,0.08)",
              color: COLORS.white,
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "1rem",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            Watch the Demo
          </Link>
        </div>

        {/*
          Hero visual placeholder.
          TODO (Agent 12 / OQ-GTM-002): Replace with Hero Slice demo video
          or a static 3D Academy screenshot when the asset is ready.
          Do NOT embed a live <iframe> video until the URL is confirmed.
          <!-- TODO: replace with Hero Slice demo video when available -->
        */}
        <div
          aria-label="3D Academy preview — coming soon"
          style={{
            marginTop: "3.5rem",
            width: "100%",
            maxWidth: "820px",
            margin: "3.5rem auto 0",
            aspectRatio: "16 / 9",
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: "16px",
            border: "1px dashed rgba(255,255,255,0.15)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
          }}
        >
          <div style={{ fontSize: "2rem", opacity: 0.25 }}>&#127775;</div>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>
            3D Academy preview coming soon
          </p>
        </div>
      </div>
    </section>
  );
}

function WhatItIsSection() {
  const columns = [
    {
      icon: "&#129504;",
      title: "AI-Powered Curriculum",
      body: "Parent controls what&apos;s taught. AI generates the mission. Every lesson is shaped by your family&apos;s goals — not a one-size-fits-all curriculum.",
    },
    {
      icon: "&#127919;",
      title: "Standards-Aware Learning",
      body: "Every mission is designed to align with real academic targets. L3ARN is built around the L3ARN Mastery Map with Florida K–8 standards mapping.",
    },
    {
      icon: "&#127757;",
      title: "A Living 3D Academy",
      body: "A true 3D Academy world that grows as students learn. Houses, companions, Moolah, and a world that visibly responds to mastery.",
    },
  ];

  return (
    <section
      style={{
        ...sectionBase,
        backgroundColor: COLORS.white,
      }}
    >
      <div style={container}>
        <h2
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 700,
            color: COLORS.ink,
            marginBottom: "0.75rem",
            textAlign: "center",
          }}
        >
          What L3ARN Is
        </h2>
        <p
          style={{
            color: COLORS.inkMuted,
            textAlign: "center",
            marginBottom: "3rem",
            fontSize: "1rem",
          }}
        >
          A parent-controlled AI homeschool OS built for the way families actually learn.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "2rem",
          }}
        >
          {columns.map((col) => (
            <div
              key={col.title}
              style={{
                backgroundColor: COLORS.cream,
                borderRadius: "12px",
                padding: "2rem 1.75rem",
              }}
            >
              <div
                aria-hidden="true"
                style={{ fontSize: "2rem", marginBottom: "1rem" }}
                dangerouslySetInnerHTML={{ __html: col.icon }}
              />
              <h3
                style={{
                  fontWeight: 700,
                  color: COLORS.ink,
                  marginBottom: "0.6rem",
                  fontSize: "1.05rem",
                }}
              >
                {col.title}
              </h3>
              <p
                style={{
                  color: COLORS.inkLight,
                  lineHeight: 1.65,
                  fontSize: "0.95rem",
                }}
                dangerouslySetInnerHTML={{ __html: col.body }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Parent sets curriculum and boundaries",
      body: "You choose subjects, set AI and social settings, and define boundaries. L3ARN works within them.",
    },
    {
      number: "02",
      title: "Child enters the Academy and chooses a House and companion",
      body: "Your child steps into a living 3D world, picks their House, and bonds with a companion that grows with them.",
    },
    {
      number: "03",
      title: "AI generates a personalized mission",
      body: "The Mission Compiler creates a standards-aware learning mission shaped by your child’s profile, interests, and your curriculum goals.",
    },
    {
      number: "04",
      title: "Child completes the mission and earns rewards",
      body: "Missions produce real evidence of learning. Effort earns Moolah and XP. Mastery unlocks major world progression.",
    },
    {
      number: "05",
      title: "Parent receives a learning map with evidence and progress",
      body: "A Unified Learning Map shows academic proof, mastery progress, and what the AI recommends next — in your language, not jargon.",
    },
  ];

  return (
    <section
      style={{
        ...sectionBase,
        backgroundColor: COLORS.cream,
      }}
    >
      <div style={container}>
        <h2
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 700,
            color: COLORS.ink,
            marginBottom: "0.75rem",
            textAlign: "center",
          }}
        >
          How It Works
        </h2>
        <p
          style={{
            color: COLORS.inkMuted,
            textAlign: "center",
            marginBottom: "3rem",
            fontSize: "1rem",
          }}
        >
          Five steps from parent setup to a learning report.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {steps.map((step) => (
            <div
              key={step.number}
              style={{
                display: "flex",
                gap: "1.5rem",
                alignItems: "flex-start",
                backgroundColor: COLORS.white,
                borderRadius: "10px",
                padding: "1.5rem",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  fontWeight: 800,
                  fontSize: "1.1rem",
                  color: COLORS.accent,
                  width: "36px",
                  paddingTop: "0.1rem",
                }}
              >
                {step.number}
              </span>
              <div>
                <h3
                  style={{
                    fontWeight: 700,
                    color: COLORS.ink,
                    marginBottom: "0.4rem",
                    fontSize: "1rem",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    color: COLORS.inkLight,
                    lineHeight: 1.65,
                    fontSize: "0.92rem",
                  }}
                >
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSignalsSection() {
  const signals = [
    {
      icon: "&#128274;",
      title: "Parent-controlled from day one",
      body: "You set the curriculum, AI settings, social settings, and boundaries. L3ARN operates within them — always.",
    },
    {
      icon: "&#128683;",
      title: "No webcam. No face capture. Audio is optional.",
      body: "L3ARN does not use webcams, face capture, or biometric features of any kind. Audio is push-to-talk only, parent-controlled, and off by default.",
    },
    {
      icon: "&#127891;",
      title: "Standards-aware from K–8",
      body: "Built with the L3ARN Mastery Map and Florida CPALMS alignment for K–8. Designed to support mastery — not replace the parent.",
    },
    {
      icon: "&#128100;",
      title: "COPPA-aligned design",
      body: "L3ARN is designed with COPPA principles in mind: parental consent, data minimization, and clear parental control. Not COPPA-certified.",
    },
  ];

  return (
    <section
      style={{
        ...sectionBase,
        backgroundColor: COLORS.white,
      }}
    >
      <div style={container}>
        <h2
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 700,
            color: COLORS.ink,
            marginBottom: "0.75rem",
            textAlign: "center",
          }}
        >
          Built for Trust
        </h2>
        <p
          style={{
            color: COLORS.inkMuted,
            textAlign: "center",
            marginBottom: "3rem",
            fontSize: "1rem",
          }}
        >
          Parent control and child safety are foundational — not optional features.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {signals.map((s) => (
            <div
              key={s.title}
              style={{
                backgroundColor: COLORS.accentLight,
                borderRadius: "10px",
                padding: "1.5rem",
              }}
            >
              <div
                aria-hidden="true"
                style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}
                dangerouslySetInnerHTML={{ __html: s.icon }}
              />
              <h3
                style={{
                  fontWeight: 700,
                  color: COLORS.ink,
                  marginBottom: "0.5rem",
                  fontSize: "1rem",
                }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  color: COLORS.inkLight,
                  lineHeight: 1.65,
                  fontSize: "0.9rem",
                }}
              >
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section
      style={{
        ...sectionBase,
        backgroundColor: COLORS.cream,
      }}
    >
      <div style={{ ...container, maxWidth: "720px" }}>
        <h2
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 700,
            color: COLORS.ink,
            marginBottom: "0.75rem",
            textAlign: "center",
          }}
        >
          Pricing
        </h2>
        <p
          style={{
            color: COLORS.inkMuted,
            textAlign: "center",
            marginBottom: "3rem",
            fontSize: "1rem",
          }}
        >
          Founding families get a permanent discount — not a limited-time offer.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {/* Beta pricing */}
          <div
            style={{
              backgroundColor: COLORS.white,
              borderRadius: "12px",
              padding: "2rem 1.75rem",
              border: `2px solid ${COLORS.accent}`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-12px",
                left: "1.5rem",
                backgroundColor: COLORS.accent,
                color: COLORS.white,
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "0.2rem 0.75rem",
                borderRadius: "20px",
                letterSpacing: "0.05em",
              }}
            >
              FOUNDING FAMILY
            </div>
            <p
              style={{
                fontWeight: 700,
                color: COLORS.inkMuted,
                fontSize: "0.85rem",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Beta
            </p>
            <p
              style={{
                fontSize: "2.5rem",
                fontWeight: 800,
                color: COLORS.ink,
                lineHeight: 1,
                marginBottom: "0.3rem",
              }}
            >
              $30
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: 400,
                  color: COLORS.inkMuted,
                }}
              >
                /month
              </span>
            </p>
            <p
              style={{
                fontSize: "0.85rem",
                color: COLORS.inkMuted,
                marginBottom: "1.25rem",
              }}
            >
              Per family · up to 2 children
            </p>
            <p
              style={{
                fontSize: "0.9rem",
                color: COLORS.inkLight,
                lineHeight: 1.6,
              }}
            >
              Founding families keep a permanent discount after beta — you
              will never pay the full public rate.
            </p>
          </div>

          {/* Public pricing */}
          <div
            style={{
              backgroundColor: COLORS.white,
              borderRadius: "12px",
              padding: "2rem 1.75rem",
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <p
              style={{
                fontWeight: 700,
                color: COLORS.inkMuted,
                fontSize: "0.85rem",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Public Launch
            </p>
            <p
              style={{
                fontSize: "2.5rem",
                fontWeight: 800,
                color: COLORS.ink,
                lineHeight: 1,
                marginBottom: "0.3rem",
              }}
            >
              ~$129
              <span
                style={{
                  fontSize: "1rem",
                  fontWeight: 400,
                  color: COLORS.inkMuted,
                }}
              >
                /month
              </span>
            </p>
            <p
              style={{
                fontSize: "0.85rem",
                color: COLORS.inkMuted,
                marginBottom: "1.25rem",
              }}
            >
              Per family · up to 2 children
            </p>
            <p
              style={{
                fontSize: "0.9rem",
                color: COLORS.inkLight,
                lineHeight: 1.6,
              }}
            >
              Additional children: approximately $20/month each. Public pricing
              is informational and subject to change before launch.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section
      style={{
        ...sectionBase,
        backgroundColor: COLORS.ink,
        color: COLORS.white,
        textAlign: "center",
      }}
    >
      <div style={container}>
        <h2
          style={{
            fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)",
            fontWeight: 800,
            marginBottom: "1rem",
            lineHeight: 1.2,
          }}
        >
          Ready to join the founding cohort?
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,0.72)",
            fontSize: "1.05rem",
            marginBottom: "2rem",
            lineHeight: 1.6,
          }}
        >
          Limited to 100 founding families. We review every application personally.
        </p>
        <Link
          href="/apply"
          style={{
            display: "inline-block",
            padding: "1rem 2.5rem",
            backgroundColor: COLORS.accent,
            color: COLORS.white,
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "1.05rem",
          }}
        >
          Apply for Founding Family Beta
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      style={{
        backgroundColor: COLORS.white,
        borderTop: `1px solid ${COLORS.border}`,
        padding: "2rem 1.5rem",
        textAlign: "center",
      }}
    >
      <div style={container}>
        <p style={{ color: COLORS.inkMuted, fontSize: "0.85rem" }}>
          &copy; {new Date().getFullYear()} L3ARN &mdash; Parent-Controlled AI
          Homeschool OS
        </p>
        <p
          style={{
            color: COLORS.inkMuted,
            fontSize: "0.8rem",
            marginTop: "0.5rem",
          }}
        >
          L3ARN is designed with COPPA principles in mind. No webcam. No face
          capture. Audio is optional and parent-controlled.
        </p>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Page entry point — React Server Component
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <>
      <Nav />
      <HeroSection />
      <WhatItIsSection />
      <HowItWorksSection />
      <TrustSignalsSection />
      <PricingSection />
      <CtaSection />
      <Footer />
    </>
  );
}
