import { WAIT_SECONDS, HOLD_MS, getNextStep } from '../../src/screens/emergencyOverrideModel';

describe('emergencyOverrideModel', () => {
  it('has correct constants', () => {
    expect(WAIT_SECONDS).toBe(8);
    expect(HOLD_MS).toBe(3000);
  });

  it('getNextStep transitions correctly', () => {
    expect(getNextStep('wait')).toBe('hold');
    expect(getNextStep('hold')).toBe('done');
    expect(getNextStep('done')).toBe('done');
  });
});
