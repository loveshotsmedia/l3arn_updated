/**
 * StudentLayout — Walled-garden shell for all student routes.
 *
 * Rules:
 * - No adult navigation (no links to parent dashboard, billing, etc.)
 * - No "back to internet" affordance — keep the walled garden feel
 * - "Pause / Return to Menu" is always available
 * - No legal name displayed anywhere (ADR-007: Academy Display Name only)
 *
 * Open Question: "Pause / Return to Menu" should eventually log a
 * session-pause world event via the Railway realtime service. Currently
 * it routes to /student/enter as a placeholder.
 */

import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface StudentLayoutProps {
  children: ReactNode;
  /** Academy Display Name shown in the student shell. Never a legal name. */
  displayName?: string;
}

export default function StudentLayout({ children, displayName }: StudentLayoutProps) {
  const navigate = useNavigate();

  function handlePause() {
    // Placeholder: in a future sprint this will dispatch a session-pause world event
    // before navigating away.
    navigate('/student/enter');
  }

  return (
    <div style={styles.shell}>
      {/* Minimal student top bar — no adult nav, no external links */}
      <header style={styles.header}>
        <span style={styles.logo}>L3ARN Academy</span>

        {displayName && (
          <span style={styles.displayName}>
            {/* Academy Display Name only — real name never shown here */}
            {displayName}
          </span>
        )}

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
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0f172a',
    color: '#f1f5f9',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1.5rem',
    background: 'rgba(30, 41, 59, 0.95)',
    borderBottom: '1px solid #1e293b',
    zIndex: 100,
  },
  logo: {
    fontWeight: 700,
    fontSize: '1.1rem',
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  displayName: {
    fontSize: '0.9rem',
    color: '#94a3b8',
  },
  pauseBtn: {
    padding: '0.4rem 1rem',
    borderRadius: '6px',
    border: '1px solid #334155',
    background: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
};
