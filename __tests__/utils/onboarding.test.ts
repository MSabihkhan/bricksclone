import { LOCATIONS, validateBrickName, defaultCategories, isTagIdInputValid, BRICK_MODES, MODE_PRESETS, DURATIONS, modeLabel, durationLabel, buildBrickSummary, CATEGORY_META, CATEGORY_PACKAGES } from '../../src/utils/onboarding';

describe('onboarding utils', () => {
  it('LOCATIONS has 6 entries with valid icon names', () => {
    expect(LOCATIONS.length).toBe(6);
    LOCATIONS.forEach(loc => {
      expect(typeof loc.icon).toBe('string');
      expect(loc.icon.length).toBeGreaterThan(0);
    });
  });

  it('validateBrickName trims', () => {
    expect(validateBrickName('  ')).toBe(false);
    expect(validateBrickName(' a ')).toBe(true);
    expect(validateBrickName('Test')).toBe(true);
  });

  it('defaultCategories shape', () => {
    const cats = defaultCategories();
    expect(cats).toEqual({
      social: true,
      games: true,
      video: true,
      news: true,
      shopping: false,
      messaging: false,
    });
  });

  it('isTagIdInputValid uses hex rule', () => {
    expect(isTagIdInputValid('04A1B2C3')).toBe(true);
    expect(isTagIdInputValid('04:A1:B2:C3')).toBe(true);
    expect(isTagIdInputValid('XYZ')).toBe(false);
  });

  it('BRICK_MODES has expected keys', () => {
    expect(BRICK_MODES.map(m => m.key)).toEqual(['deep', 'wind', 'custom']);
  });

  it('MODE_PRESETS defines deep and wind correctly', () => {
    expect(MODE_PRESETS['deep'].social).toBe(true);
    expect(MODE_PRESETS['wind'].shopping).toBe(true);
  });

  it('DURATIONS includes 25, 50, 90, inf', () => {
    expect(DURATIONS.map(d => d.key)).toEqual(['25', '50', '90', 'inf']);
  });

  it('modeLabel returns proper string', () => {
    expect(modeLabel('deep')).toBe('Deep Work');
    expect(modeLabel('wind')).toBe('Wind Down');
    expect(modeLabel('custom')).toBe('Custom');
    expect(modeLabel('unknown')).toBe('Custom');
  });

  it('durationLabel fallback works', () => {
    expect(durationLabel('90')).toBe('90 min');
    expect(durationLabel('inf')).toBe('Until I tap out');
    expect(durationLabel('unknown')).toBe('50 min');
  });

  it('buildBrickSummary generates correct chips in order', () => {
    const chips = buildBrickSummary('deep', { social: true, video: true, news: false }, '25');
    expect(chips).toHaveLength(3);
    expect(chips[0]).toEqual({ label: 'Deep Work', icon: 'target' });
    expect(chips[1]).toEqual({ label: '2 apps', icon: 'shield' });
    expect(chips[2]).toEqual({ label: '25 min', icon: 'timer' });
  });

  it('CATEGORY_PACKAGES covers every CATEGORY_META key', () => {
    const metaKeys = CATEGORY_META.map(m => m.key);
    const pkgKeys = Object.keys(CATEGORY_PACKAGES);
    expect(metaKeys.every(k => pkgKeys.includes(k))).toBe(true);
  });
});
