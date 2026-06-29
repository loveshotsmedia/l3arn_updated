"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";

interface StudentLayoutProps {
  children: ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const router = useRouter();

  function handlePause() {
    router.push("/student/enter");
  }

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <span style={styles.logo}>L3ARN Academy</span>
        <button style={styles.pauseBtn} onClick={handlePause}>
          Pause
        </button>
      </header>
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#0f172a",
    color: "#f1f5f9",
    fontFamily: "system-ui, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.75rem 1.5rem",
    background: "rgba(30, 41, 59, 0.95)",
    borderBottom: "1px solid #1e293b",
    zIndex: 100,
  },
  logo: {
    fontWeight: 700,
    fontSize: "1.1rem",
    background: "linear-gradient(135deg, #6366f1, #818cf8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  pauseBtn: {
    padding: "0.4rem 1rem",
    borderRadius: "6px",
    border: "1px solid #334155",
    background: "transparent",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 600,
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
};
