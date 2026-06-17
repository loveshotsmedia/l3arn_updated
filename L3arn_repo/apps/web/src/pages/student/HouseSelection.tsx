/**
 * HouseSelection — Onboarding step: student chooses their House.
 *
 * Four house options are displayed as clickable cards. The student
 * selects one and continues to companion selection.
 *
 * On selection, the house is written to:
 * - localStorage (immediate, for the current session's avatar color)
 * - Supabase academy_identities.house field (placeholder — requires
 *   authenticated Supabase client with a valid child session scope)
 *
 * House data is typed using HouseSchema from @l3arn/shared-contracts.
 * The four houses are: Valkryn, Lyrion, Novari, Cytrex.
 *
 * Open Question (identity.schema.ts): ChildProfileSchema does NOT have a
 * house_affiliation field directly — house lives on AcademyIdentitySchema.
 * The Supabase write target is academy_identities.house (not child_profiles).
 * This is noted here for the Agent D (Supabase/Data) integration review.
 *
 * Open Question: Placeholder imagery / art assets are not yet available.
 * House mascots (Storm Griffin, Songweaver Serpent, Ember Phoenix, Circuit
 * Wyvern) are listed in architecture.md §7. Replace emoji with real assets
 * when Agent L (Character/IP) delivers them.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentLayout from './StudentLayout';

type House = 'Valkryn' | 'Lyrion' | 'Novari' | 'Cytrex';

interface HouseCard {
  id: House;
  name: string;
  tagline: string;
  color: string;
  mascot: string; // placeholder text — replace with asset when available
  emoji: string;
}

const HOUSES: HouseCard[] = [
  {
    id: 'Valkryn',
    name: 'Valkryn',
    tagline: 'Sports, movement, courage, discipline.',
    color: '#ef4444',
    mascot: 'Storm Griffin',
    emoji: '⚡',
  },
  {
    id: 'Lyrion',
    name: 'Lyrion',
    tagline: 'Music, arts, storytelling, expression.',
    color: '#a855f7',
    mascot: 'Songweaver Serpent',
    emoji: '🎵',
  },
  {
    id: 'Novari',
    name: 'Novari',
    tagline: 'Science, discovery, nature, transformation.',
    color: '#22c55e',
    mascot: 'Ember Phoenix',
    emoji: '🔥',
  },
  {
    id: 'Cytrex',
    name: 'Cytrex',
    tagline: 'Technology, AI, coding, systems.',
    color: '#3b82f6',
    mascot: 'Circuit Wyvern',
    emoji: '⚙️',
  },
];

export default function HouseSelection() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<House | null>(null);
  const [saving, setSaving] = useState(false);

  const displayName = localStorage.getItem('l3arn_display_name') ?? 'Explorer';

  async function handleConfirm() {
    if (!selected) return;
    setSaving(true);

    // Persist to localStorage for immediate session use
    localStorage.setItem('l3arn_house', selected);

    // Placeholder Supabase write — will be replaced with authenticated client call.
    // Target: UPDATE academy_identities SET house = $house WHERE child_profile_id = $id
    // Requires: valid child session scope (ChildSessionScopeSchema from permissions.schema.ts)
    // Open Question: need child session ID injected here. Placeholder logs instead.
    console.log(
      '[L3ARN] Placeholder Supabase write — academy_identities.house:',
      selected,
    );

    setSaving(false);
    navigate('/student/onboarding/companion');
  }

  return (
    <StudentLayout displayName={displayName}>
      <div style={styles.container}>
        <h1 style={styles.heading}>Choose Your House</h1>
        <p style={styles.subheading}>
          Your house is your community in the Academy. Choose the one that
          calls to you.
        </p>

        <div style={styles.grid}>
          {HOUSES.map((house) => (
            <button
              key={house.id}
              style={{
                ...styles.card,
                borderColor: selected === house.id ? house.color : 'transparent',
                boxShadow:
                  selected === house.id
                    ? `0 0 24px ${house.color}44`
                    : '0 2px 8px rgba(0,0,0,0.3)',
              }}
              onClick={() => setSelected(house.id)}
            >
              <div style={styles.emoji}>{house.emoji}</div>
              <h2 style={{ ...styles.houseName, color: house.color }}>
                {house.name}
              </h2>
              <p style={styles.houseMascot}>{house.mascot}</p>
              <p style={styles.houseTagline}>{house.tagline}</p>
            </button>
          ))}
        </div>

        <button
          style={{
            ...styles.confirmBtn,
            opacity: selected ? 1 : 0.4,
            cursor: selected ? 'pointer' : 'not-allowed',
          }}
          disabled={!selected || saving}
          onClick={handleConfirm}
        >
          {saving ? 'Joining...' : selected ? `Join ${selected}` : 'Select a House'}
        </button>
      </div>
    </StudentLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem 1rem',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    minHeight: 'calc(100vh - 52px)',
  },
  heading: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#f1f5f9',
    marginBottom: '0.5rem',
    textAlign: 'center' as const,
  },
  subheading: {
    color: '#94a3b8',
    textAlign: 'center' as const,
    maxWidth: '480px',
    marginBottom: '2.5rem',
    lineHeight: 1.6,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    width: '100%',
    maxWidth: '900px',
    marginBottom: '2rem',
  },
  card: {
    background: 'rgba(30, 41, 59, 0.9)',
    border: '2px solid transparent',
    borderRadius: '12px',
    padding: '1.5rem 1rem',
    cursor: 'pointer',
    textAlign: 'center' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.5rem',
  },
  emoji: {
    fontSize: '2.5rem',
    marginBottom: '0.25rem',
  },
  houseName: {
    fontSize: '1.3rem',
    fontWeight: 700,
    margin: 0,
  },
  houseMascot: {
    fontSize: '0.8rem',
    color: '#64748b',
    margin: 0,
    fontStyle: 'italic',
  },
  houseTagline: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    margin: 0,
    lineHeight: 1.5,
  },
  confirmBtn: {
    padding: '0.875rem 2.5rem',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
};
