import { asksOutcome, getRoutine, OUTCOME_ROUTINE_TYPES, ROUTINES, summarizeByRitual } from '../../src/features/rituals';
import { computeKeyboardInset } from '../../src/hooks/useKeyboardInset';
import { brickConfigLines } from '../../src/screens/homeHeaderModel';

describe('rituals', () => {
  it('only grades task rituals — never prayer, bedtime, or family time', () => {
    expect(OUTCOME_ROUTINE_TYPES).toEqual(['study', 'work']);
    expect(asksOutcome('prayer')).toBe(false);
    expect(asksOutcome('family')).toBe(false);
    expect(asksOutcome('bedtime')).toBe(false);
  });

  it('gives every ritual the copy the guide and picker need', () => {
    for (const routine of ROUTINES) {
      expect(routine.tagline.length).toBeGreaterThan(0);
      expect(routine.benefit.length).toBeGreaterThan(0);
      expect(routine.suggestedSetup.length).toBeGreaterThan(0);
    }
  });

  it('falls back to study for unknown ids', () => {
    expect(getRoutine('nope').id).toBe('study');
  });

  it('totals focus time per ritual, skipping failed starts', () => {
    const summary = summarizeByRitual([
      { routineType: 'study', durationSec: 600, endedVia: 'nfc' },
      { routineType: 'study', durationSec: 300, endedVia: 'timer' },
      { routineType: 'prayer', durationSec: 900, endedVia: 'timer' },
      { routineType: 'work', durationSec: 0, endedVia: 'start_failed' },
    ]);
    expect(summary).toEqual([
      { id: 'study', label: 'Study', sessions: 2, focusSec: 900 },
      { id: 'prayer', label: 'Prayer', sessions: 1, focusSec: 900 },
    ]);
  });
});

describe('Home Brick cards', () => {
  it('hides the saved duration when sessions only end by tapping the Brick', () => {
    expect(brickConfigLines({ duration: '50', strict: 1 }, 'brick')).toEqual(['Ends on tap', 'Strict']);
  });

  it('shows the Brick’s own limit in time-limit mode', () => {
    expect(brickConfigLines({ duration: '25', strict: 0 }, 'timer')).toEqual(['25 min limit', 'Flexible']);
    expect(brickConfigLines({ duration: 'inf', strict: 1 }, 'timer')[0]).toBe('Ends on tap');
  });
});

describe('computeKeyboardInset', () => {
  it('pads by the full keyboard height when the window did not resize', () => {
    expect(computeKeyboardInset(300, 800, 800)).toBe(300);
  });

  it('adds nothing when the OS already resized the window', () => {
    expect(computeKeyboardInset(300, 800, 500)).toBe(0);
  });

  it('pads only the remainder after a partial resize', () => {
    expect(computeKeyboardInset(300, 800, 700)).toBe(200);
  });

  it('is zero with the keyboard closed', () => {
    expect(computeKeyboardInset(0, 800, 800)).toBe(0);
  });
});
