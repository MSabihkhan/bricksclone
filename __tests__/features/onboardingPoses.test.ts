import { ONBOARDING_POSES, PAGE_COUNT } from '../../src/features/onboardingPoses';
import { protectedLine } from '../../src/components/SessionDoneSheet';

describe('card onboarding poses', () => {
  it('has one pose per page: meet, pair, permissions, tap to start', () => {
    expect(PAGE_COUNT).toBe(4);
  });

  it('shows the phone only on the pair and tap-to-start pages', () => {
    expect(ONBOARDING_POSES.map(p => p.po)).toEqual([0, 1, 0, 1]);
  });

  it('tucks the card away on the permissions page so the checklist has room', () => {
    expect(ONBOARDING_POSES[2].s).toBeLessThan(0.5);
  });
});

describe('session summary line', () => {
  it('reads naturally at every length', () => {
    expect(protectedLine(20)).toBe('Under a minute, protected.');
    expect(protectedLine(60)).toBe('1 minute, protected.');
    expect(protectedLine(47 * 60)).toBe('47 minutes, protected.');
    expect(protectedLine(120 * 60)).toBe('2h protected.');
    expect(protectedLine(95 * 60)).toBe('1h 35m protected.');
  });
});
