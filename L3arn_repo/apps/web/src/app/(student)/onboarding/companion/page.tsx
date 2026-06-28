"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { selectCompanion } from "../../../../lib/student-session";

interface CompanionTemplate {
  id: string;
  name: string;
  style: string;
  tone: string;
  description: string;
  emoji: string;
  color: string;
}

const COMPANION_TEMPLATES: CompanionTemplate[] = [
  { id: "comp-001-spark", name: "Spark", style: "curious-inventor", tone: "enthusiastic", description: "Loves experiments and always has a new idea. Perfect for hands-on learners.", emoji: "⚡", color: "#f59e0b" },
  { id: "comp-002-luna", name: "Luna", style: "calm-guide", tone: "encouraging", description: "Patient, thoughtful, and calm. Great for students who like step-by-step guidance.", emoji: "🌙", color: "#8b5cf6" },
  { id: "comp-003-bolt", name: "Bolt", style: "energetic-challenger", tone: "playful", description: "High energy and loves a challenge. Best for students who want to push their limits.", emoji: "🏆", color: "#22c55e" },
];

export default function CompanionSelectionPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!selected) return;
    const companion = COMPANION_TEMPLATES.find((c) => c.id === selected);
    if (!companion) return;
    setSaving(true);
    setError(null);

    // Backend-mediated write (ADR-031): Railway validates the child session
    // token and upserts companion_profiles. companionKey === template id so
    // downstream growth/reward events line up.
    const outcome = await selectCompanion({
      companionKey: companion.id,
      characterName: companion.name,
      characterStyle: companion.style,
      teachingTone: companion.tone,
      templateId: companion.id,
    });

    if (outcome.ok) {
      setSaving(false);
      router.push("/student/academy");
      return;
    }

    // Dev-only escape hatch — preserve local UI development; never in production.
    if (
      outcome.error === "SESSION_TOKEN_MISSING" &&
      process.env.NODE_ENV !== "production"
    ) {
      localStorage.setItem("l3arn_companion_id", companion.id);
      localStorage.setItem("l3arn_companion_name", companion.name);
      console.warn(
        "[L3ARN DEV] No session token — companion NOT persisted to Supabase. " +
          "Enter via a parent-launched link to test the real write. companion:",
        companion.id,
      );
      setSaving(false);
      router.push("/student/academy");
      return;
    }

    setError(outcome.message);
    setSaving(false);
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Choose Your Companion</h1>
      <p style={styles.subheading}>Your companion guides you through missions. They grow stronger as you learn.</p>
      <div style={styles.grid}>
        {COMPANION_TEMPLATES.map((companion) => (
          <button key={companion.id} style={{ ...styles.card, borderColor: selected === companion.id ? companion.color : "transparent", boxShadow: selected === companion.id ? `0 0 24px ${companion.color}44` : "0 2px 8px rgba(0,0,0,0.3)" }} onClick={() => setSelected(companion.id)}>
            <div style={styles.emoji}>{companion.emoji}</div>
            <h2 style={{ ...styles.companionName, color: companion.color }}>{companion.name}</h2>
            <p style={styles.companionStyle}>{companion.style}</p>
            <p style={styles.companionDesc}>{companion.description}</p>
          </button>
        ))}
      </div>
      <button style={{ ...styles.confirmBtn, opacity: selected ? 1 : 0.4, cursor: selected ? "pointer" : "not-allowed" }} disabled={!selected || saving} onClick={handleConfirm}>
        {saving ? "Bonding..." : selected ? `Choose ${COMPANION_TEMPLATES.find((c) => c.id === selected)?.name}` : "Select a Companion"}
      </button>
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 1rem", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", minHeight: "calc(100vh - 52px)" },
  heading: { fontSize: "2rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.5rem", textAlign: "center" as const },
  subheading: { color: "#94a3b8", textAlign: "center" as const, maxWidth: "480px", marginBottom: "2.5rem", lineHeight: 1.6 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", width: "100%", maxWidth: "760px", marginBottom: "2rem" },
  card: { background: "rgba(30, 41, 59, 0.9)", border: "2px solid transparent", borderRadius: "12px", padding: "1.5rem 1rem", cursor: "pointer", textAlign: "center" as const, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.5rem" },
  emoji: { fontSize: "2.5rem", marginBottom: "0.25rem" },
  companionName: { fontSize: "1.3rem", fontWeight: 700, margin: 0 },
  companionStyle: { fontSize: "0.78rem", color: "#64748b", margin: 0, fontStyle: "italic" },
  companionDesc: { fontSize: "0.85rem", color: "#94a3b8", margin: 0, lineHeight: 1.5 },
  confirmBtn: { padding: "0.875rem 2.5rem", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff", fontSize: "1rem", fontWeight: 700 },
  error: { color: "#f87171", fontSize: "0.9rem", marginTop: "1rem", textAlign: "center" as const, maxWidth: "480px" },
};
