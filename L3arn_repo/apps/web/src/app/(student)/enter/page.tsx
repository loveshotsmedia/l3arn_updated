"use client";

import { useRouter } from "next/navigation";

export default function EnterAcademyPage() {
  const router = useRouter();

  const displayName =
    typeof window !== "undefined"
      ? (localStorage.getItem("l3arn_display_name") ?? "Explorer")
      : "Explorer";
  const academyName =
    typeof window !== "undefined"
      ? (localStorage.getItem("l3arn_academy_name") ?? "The L3ARN Academy")
      : "The L3ARN Academy";

  function handleEnter() {
    router.push("/student/academy");
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.badge}>Welcome back</div>
        <h1 style={styles.name}>{displayName}</h1>
        <p style={styles.academy}>{academyName}</p>
        <p style={styles.tagline}>Your companions and missions are waiting inside.</p>
        <button style={styles.enterBtn} onClick={handleEnter}>
          Enter the Academy
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    minHeight: "calc(100vh - 52px)",
  },
  card: { textAlign: "center", maxWidth: "400px", width: "100%" },
  badge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "999px",
    background: "rgba(99, 102, 241, 0.15)",
    border: "1px solid rgba(99, 102, 241, 0.4)",
    color: "#818cf8",
    fontSize: "0.8rem",
    fontWeight: 600,
    marginBottom: "1rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
  },
  name: { fontSize: "2.5rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "0.25rem" },
  academy: { color: "#94a3b8", fontSize: "1rem", marginBottom: "1.5rem" },
  tagline: { color: "#64748b", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2rem" },
  enterBtn: {
    padding: "0.875rem 2.5rem",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #818cf8)",
    color: "#fff",
    fontSize: "1.1rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 24px rgba(99, 102, 241, 0.4)",
  },
};
