import { isOnboarded, completeOnboarding } from '../../src/state/onboarding';
import { db } from '../../src/db';

jest.mock('../../src/db', () => ({
  db: {
    init: jest.fn(),
    settings: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
}));

describe('onboarding state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isOnboarded', () => {
    it('returns true when onboarded is "1"', async () => {
      (db.settings.get as jest.Mock).mockResolvedValue('1');
      const result = await isOnboarded();
      expect(db.init).toHaveBeenCalled();
      expect(db.settings.get).toHaveBeenCalledWith('onboarded');
      expect(result).toBe(true);
    });

    it('returns false when onboarded is not "1"', async () => {
      (db.settings.get as jest.Mock).mockResolvedValue(undefined);
      let result = await isOnboarded();
      expect(result).toBe(false);

      (db.settings.get as jest.Mock).mockResolvedValue('0');
      result = await isOnboarded();
      expect(result).toBe(false);
    });
  });

  describe('completeOnboarding', () => {
    it('sets onboarded to "1"', async () => {
      await completeOnboarding();
      expect(db.init).toHaveBeenCalled();
      expect(db.settings.set).toHaveBeenCalledWith('onboarded', '1');
    });
  });
});
