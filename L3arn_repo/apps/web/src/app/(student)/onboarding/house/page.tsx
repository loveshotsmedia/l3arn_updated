"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type House = "Valkryn" | "Lyrion" | "Novari" | "Cytrex";

interface HouseCard {
  id: House;
  name: string;
  tagline: string;
  color: string;
  mascot: string;
  emoji: string;
}

const HOUSES: HouseCard[] = [
  { id: "Valkryn", name: "Valkryn", tagline: "Sports, movement, courage, discipline.", color: "#ef4444", mascot: "Storm Griffin", emoji: "⚡" },
  { id: "Lyrion", name: "Lyrion", tagline: "Music, arts, storytelling, expression.", color: "#a855f7", mascot: "Songweaver Serpent", emoji: "🎵" },
  { id: "Novari", name: "Novari", tagline: "Science, discovery, nature, transformation.", color: "#22c55e", mascot: "Ember Phoenix", emoji: "🔥" },
  { id: "Cytrex", name: "Cytrex", tagline: "Technology, AI, coding, systems.", color: "#3b82f6", mascot: "Circuit Wyvern", emoji: "⚙️" },
];

export default function HouseSelectionPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<House | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    if (!selected) return;
    setSaving(true);
    // SPRINT 2 TODO: Replace this placeholder with a backend-mediated write.
    // Required flow:
    //   1. POST /api/student/session/house  { house: selected }
    //      with Authorization: Bearer <child-session-token>
    //   2. Railway validates child_sessions row (ADR-031)
    //   3. Railway writes academy_identities.house = selected (NOT child_profiles)
    //   4. Railway returns { success: true, house: selected }
    // Do NOT write directly to Supabase from the frontend for this.
    localStorage.setItem("l3arn_house", selected);
    console.warn(
      "[L3ARN PLACEHOLDER] House selection not persisted to Supabase. " +
      "Backend-mediated write required (Sprint 2). house:", selected
    );
    setSaving(false);
    router.push("/student/onboarding/companion");
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Choose Your House</h1>
      <p style={styles.subheading}>Your house is your community in the Academy.</p>
      <div style={styles.grid}>
        {HOUSES.map((house) => (
          <button
            key={house.id}
            style={{ ...styles.card, borderColor: selected === house.id ? house.color : "transparent", boxShadow: selected === house.id ? `0 0 24px ${house.color}44` : "0 2px 8px rgba(0,0,0,0.3)" }}
            onClick={() => setSelected(house.id)}
          >
            <div style={styles.emoji}>{house.emoji}</div>
            <h2 style={{ ...styles.houseName, color: house.color }}>{house.name}</h2>
            <p style={styles.houseMascot}>{house.mascot}</p>
            <p style={styles.houseTagline}>{house.tagline}</p>
          </button>
        ))}
      </div>
      <button style={{ ...styles.confirmBtn, opacity: selected ? 1 : 0.4, cursor: selected ? "pointer" : "not-allowed" }} disabled={!selected || saving} onClick={handleConfirm}>
        {saving ? "Joining..." : selected ? `Join ${selected}` : "Select a House"}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 1rem", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", minHeight: "calc(100vh - 52px)" },
  heading: { fontSize: "2rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.5rem", textAlign: "center" as const },
  subheading: { color: "#94a3b8", textAlign: "center" as const, maxWidth: "480px", marginBottom: "2.5rem", lineHeight: 1.6 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", width: "100%", maxWidth: "900px", marginBottom: "2rem" },
  card: { background: "rgba(30, 41, 59, 0.9)", border: "2px solid transparent", borderRadius: "12px", padding: "1.5rem 1rem", cursor: "pointer", textAlign: "center" as const, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "0.5rem" },
  emoji: { fontSize: "2.5rem", marginBottom: "0.25rem" },
  houseName: { fontSize: "1.3rem", fontWeight: 700, margin: 0 },
  houseMascot: { fontSize: "0.8rem", color: "#64748b", margin: 0, fontStyle: "italic" },
  houseTagline: { fontSize: "0.85rem", color: "#94a3b8", margin: 0, lineHeight: 1.5 },
  confirmBtn: { padding: "0.875rem 2.5rem", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #6366f1, #818cf8)", color: "#fff", fontSize: "1rem", fontWeight: 700 },
};
