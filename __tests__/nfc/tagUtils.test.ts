import { normalizeTagId, isValidTagId, formatTagId, isRegisteredTag } from '../../src/services/nfc/tagUtils';

describe('tagUtils', () => {
  describe('normalizeTagId', () => {
    it('normalizes A1:B2:C3:D4', () => {
      expect(normalizeTagId('A1:B2:C3:D4')).toBe('A1B2C3D4');
    });
    it('normalizes a1-b2-c3', () => {
      expect(normalizeTagId('a1-b2-c3')).toBe('A1B2C3');
    });
    it('normalizes 0xa1b2c3', () => {
      expect(normalizeTagId('0xa1b2c3')).toBe('A1B2C3');
    });
    it('normalizes spaces', () => {
      expect(normalizeTagId(' A1 B2 C3 ')).toBe('A1B2C3');
    });
    it('normalizes empty', () => {
      expect(normalizeTagId('')).toBe('');
    });
  });

  describe('isValidTagId', () => {
    it('accepts valid hex lengths', () => {
      expect(isValidTagId('A1B2')).toBe(true);
      expect(isValidTagId('A'.repeat(64))).toBe(true);
    });
    it('rejects XYZ', () => {
      expect(isValidTagId('XYZ')).toBe(false);
    });
    it('rejects 1A too short', () => {
      expect(isValidTagId('1A')).toBe(false);
    });
    it('rejects empty', () => {
      expect(isValidTagId('')).toBe(false);
    });
  });

  describe('formatTagId', () => {
    it('formats 7F3A22 to BRK-7F3A-22', () => {
      expect(formatTagId('7F3A22')).toBe('BRK-7F3A-22');
    });
    it('formats A1B2C3D4E5F6 to BRK-A1B2-C3D4-E5F6', () => {
      expect(formatTagId('A1B2C3D4E5F6')).toBe('BRK-A1B2-C3D4-E5F6');
    });
    it('formats a1b2 to BRK-A1B2', () => {
      expect(formatTagId('a1b2')).toBe('BRK-A1B2');
    });
  });

  describe('isRegisteredTag', () => {
    const registered = ['7F3A22', 'a1b2c3d4'];
    it('identifies registered tags case/format-insensitively', () => {
      expect(isRegisteredTag('7f3a:22', registered)).toBe(true);
      expect(isRegisteredTag('A1B2C3D4', registered)).toBe(true);
    });
    it('identifies unknown tags', () => {
      expect(isRegisteredTag('AABBCC', registered)).toBe(false);
    });
    it('rejects empty input', () => {
      expect(isRegisteredTag('', registered)).toBe(false);
    });
  });
});
