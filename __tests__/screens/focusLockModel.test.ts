import { focusCaption, focusClock } from '../../src/screens/focusLockModel';

describe('focus screen text', () => {
  it('shows mm:ss, and h:mm:ss past an hour', () => {
    expect(focusClock(24 * 60 + 17)).toBe('24:17');
    expect(focusClock(3909)).toBe('1:05:09');
    expect(focusClock(-5)).toBe('00:00');
  });

  it('says how the session ends', () => {
    expect(focusCaption(true, 'Desk', null)).toBe('elapsed · ends when you tap Desk');
    const end = Math.floor(new Date(2026, 9, 12, 15, 40).getTime() / 1000);
    expect(focusCaption(false, 'Desk', end)).toBe('left · ends at 3:40 PM, or tap Desk');
  });
});
