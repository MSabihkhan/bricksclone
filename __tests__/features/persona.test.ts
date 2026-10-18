import { canBlink, CARD_ASPECT, facePaths, parsePersonaEnabled, PERSONA, PersonaState, wordCount } from '../../src/features/persona';

const STATES: PersonaState[] = ['idle', 'session_started', 'session_completed', 'blocked_app_opened'];

describe('persona', () => {
  it('keeps the four event names the app emits', () => {
    expect(STATES.every(s => s in PERSONA)).toBe(true);
  });

  it('speaks in five words or fewer', () => {
    for (const s of STATES) expect(wordCount(PERSONA[s].line)).toBeLessThanOrEqual(5);
  });

  it('never says anything while asleep', () => {
    expect(PERSONA.asleep.line).toBe('');
  });

  it('uses the printed card proportions (85.08 × 54.10 mm)', () => {
    expect(CARD_ASPECT).toBeCloseTo(54.1 / 85.08, 2);
  });

  it('draws every face inside the red band above the wordmark', () => {
    for (const face of [...STATES, 'asleep' as const]) {
      const { leftEye, rightEye, mouth } = facePaths(face);
      const ys = [leftEye, rightEye, mouth].flatMap(d => d.match(/-?\d+(\.\d+)?/g)!.map(Number).filter((_, i) => i % 2 === 1));
      // "TAP HERE" ends ~10 units down; the wordmark starts ~34 units down (of 63.6).
      expect(Math.min(...ys)).toBeGreaterThan(10);
      expect(Math.max(...ys)).toBeLessThan(38);
    }
  });

  it('blinks only when resting and motion is allowed', () => {
    expect(canBlink('idle', false)).toBe(true);
    expect(canBlink('idle', true)).toBe(false);
    expect(canBlink('session_completed', false)).toBe(false);
    expect(facePaths('idle', true).leftEye).not.toBe(facePaths('idle').leftEye);
  });

  it('is on unless switched off', () => {
    expect(parsePersonaEnabled(undefined)).toBe(true);
    expect(parsePersonaEnabled('1')).toBe(true);
    expect(parsePersonaEnabled('0')).toBe(false);
  });
});
