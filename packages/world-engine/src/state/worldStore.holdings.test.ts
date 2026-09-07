import { describe, it, expect, beforeEach } from 'vitest';
import { useWorldStore } from './worldStore';

/**
 * Holdings state (Task 14 — "Mastery Makes the World", spec §3.4).
 * MasteryBuilding reads unlockedHoldingIds to decide whether to render, so the
 * add/idempotency contract here is what keeps a re-unlock from duplicating a
 * building or re-triggering a render.
 */
describe('worldStore — unlockedHoldingIds', () => {
  beforeEach(() => {
    useWorldStore.getState().setUnlockedHoldingIds([]);
  });

  it('starts empty', () => {
    expect(useWorldStore.getState().unlockedHoldingIds).toEqual([]);
  });

  it('setUnlockedHoldingIds replaces the list (hydration from GET /holdings)', () => {
    useWorldStore.getState().setUnlockedHoldingIds(['fractions-observatory', 'other']);
    expect(useWorldStore.getState().unlockedHoldingIds).toEqual([
      'fractions-observatory',
      'other',
    ]);
  });

  it('addUnlockedHoldingId appends a new id', () => {
    useWorldStore.getState().addUnlockedHoldingId('fractions-observatory');
    expect(useWorldStore.getState().unlockedHoldingIds).toEqual(['fractions-observatory']);
  });

  it('addUnlockedHoldingId is idempotent — adding the same id twice keeps one entry and the same reference', () => {
    const store = useWorldStore.getState();
    store.addUnlockedHoldingId('fractions-observatory');
    const afterFirst = useWorldStore.getState().unlockedHoldingIds;
    store.addUnlockedHoldingId('fractions-observatory');
    const afterSecond = useWorldStore.getState().unlockedHoldingIds;

    expect(afterSecond).toEqual(['fractions-observatory']);
    // No-op on duplicate: the array reference is unchanged (avoids a needless re-render).
    expect(afterSecond).toBe(afterFirst);
  });
});
