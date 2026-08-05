import { detectOem } from '../../src/services/oem/oemDetection';

describe('oemDetection', () => {
  it('detects Xiaomi as aggressive', () => {
    const info = detectOem('Xiaomi');
    expect(info.id).toBe('xiaomi');
    expect(info.isAggressive).toBe(true);
    expect(info.batterySteps.length).toBeGreaterThan(0);
    expect(info.autostartSteps.length).toBeGreaterThan(0);
  });

  it('detects Redmi Note 11 as aggressive', () => {
    const info = detectOem('Redmi Note 11');
    expect(info.id).toBe('redmi');
  });

  it('detects POCO X5 as aggressive', () => {
    const info = detectOem('POCO X5');
    expect(info.id).toBe('poco');
  });

  it('detects OPPO CPH2451 as aggressive', () => {
    const info = detectOem('OPPO CPH2451');
    expect(info.id).toBe('oppo');
  });

  it('detects realme 9 as aggressive', () => {
    const info = detectOem('realme 9');
    expect(info.id).toBe('realme');
  });

  it('detects vivo 1906 as aggressive', () => {
    const info = detectOem('vivo 1906');
    expect(info.id).toBe('vivo');
  });

  it('detects iQOO 12 as aggressive', () => {
    const info = detectOem('iQOO 12');
    expect(info.id).toBe('vivo');
  });

  it('detects samsung SM-S918B as aggressive', () => {
    const info = detectOem('samsung SM-S918B');
    expect(info.id).toBe('samsung');
  });

  it('detects Google as not aggressive', () => {
    const info = detectOem('Google');
    expect(info.id).toBe('google');
    expect(info.isAggressive).toBe(false);
  });

  it('detects Fairphone as generic not aggressive', () => {
    const info = detectOem('Fairphone');
    expect(info.id).toBe('generic');
    expect(info.isAggressive).toBe(false);
  });
});
