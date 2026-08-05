export const WAIT_SECONDS = 8;
export const HOLD_MS = 3000;

export type OverrideStep = 'wait' | 'hold' | 'done';

export function getNextStep(current: OverrideStep): OverrideStep {
  if (current === 'wait') return 'hold';
  if (current === 'hold') return 'done';
  return 'done';
}
