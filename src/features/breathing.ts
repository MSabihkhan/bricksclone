/**
 * Cyclic sighing: inhale through the nose, a short second inhale to top up the lungs, then a
 * long slow exhale through the mouth. Chosen because a randomized trial (Balban et al., Cell
 * Reports Medicine, 2023; 111 healthy adults, 5 min/day for a month) found it improved mood
 * and lowered breathing rate more than mindfulness meditation. Timings follow the redesign:
 * 2 s in, 1 s top-up, 4 s out — 7 s a breath, about 8.5 a minute, exhale longer than the
 * inhales. Sources and limits: docs/RITUALS.md.
 */
export type BreathPhase = 'inhale' | 'topUp' | 'exhale';

export const BREATH_CYCLE: Array<{ phase: BreathPhase; ms: number; cue: string }> = [
  { phase: 'inhale', ms: 2000, cue: 'Breathe in' },
  { phase: 'topUp', ms: 1000, cue: 'One more sip of air' },
  { phase: 'exhale', ms: 4000, cue: 'Let it all out' },
];

export const CYCLE_MS = BREATH_CYCLE.reduce((sum, step) => sum + step.ms, 0);
export const RESET_MINUTES = [1, 2, 5] as const;

export interface BreathState {
  phase: BreathPhase;
  cue: string;
  /** Circle size, 0.55 (empty) to 1 (full), as the design draws it. */
  scale: number;
  /** 1-based breath number. */
  breath: number;
  breaths: number;
  secondsLeft: number;
  done: boolean;
}

export function breathsFor(minutes: number): number {
  return Math.max(1, Math.round((minutes * 60_000) / CYCLE_MS));
}

/** Where the reset is after `elapsedMs`. Ends after the last full breath out. */
export function breathAt(elapsedMs: number, minutes: number): BreathState {
  const breaths = breathsFor(minutes);
  const t = Math.max(0, elapsedMs);
  const total = breaths * CYCLE_MS;
  const secondsLeft = Math.max(0, Math.ceil((minutes * 60_000 - t) / 1000));
  if (t >= total) return { phase: 'exhale', cue: 'Settled', scale: 0.55, breath: breaths, breaths, secondsLeft: 0, done: true };
  const breath = Math.floor(t / CYCLE_MS);
  const ph = (t - breath * CYCLE_MS) / 1000;
  let scale: number;
  let step: number;
  if (ph < 2) { scale = 0.55 + (ph / 2) * 0.3; step = 0; }
  else if (ph < 3) { scale = 0.85 + (ph - 2) * 0.15; step = 1; }
  else { scale = 1 - ((ph - 3) / 4) * 0.45; step = 2; }
  return { phase: BREATH_CYCLE[step].phase, cue: BREATH_CYCLE[step].cue, scale, breath: breath + 1, breaths, secondsLeft, done: false };
}

export function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
