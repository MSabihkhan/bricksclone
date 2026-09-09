import { registerBrick } from '../../src/screens/registerTagModel';
import { db } from '../../src/db';
import { normalizeTagId } from '../../src/services/nfc/tagUtils';
import { defaultCategories } from '../../src/utils/onboarding';

jest.mock('../../src/db', () => ({
  db: {
    tags: {
      registerTag: jest.fn().mockResolvedValue(undefined),
    },
    settings: {
      get: jest.fn().mockResolvedValue(undefined),
    },
  }
}));

describe('registerTagModel', () => {
  it('registers via db.tags with normalizeTagId', async () => {
    const rawTag = '04:a1:b2:c3';
    const name = 'Desk';
    const loc = 'desk';
    
    await registerBrick(rawTag, name, loc);
    
    expect(db.tags.registerTag).toHaveBeenCalledWith(
      expect.objectContaining({
        id: normalizeTagId(rawTag),
        name,
        location: loc,
        mode: 'deep',
        categories: defaultCategories(),
        duration: '50',
        strict: 1
      })
    );
  });

  it('uses the configured default strict mode', async () => {
    (db.settings.get as jest.Mock).mockResolvedValueOnce('0');

    await registerBrick('aabb', 'Sofa', 'sofa');

    expect(db.tags.registerTag).toHaveBeenCalledWith(expect.objectContaining({ strict: 0 }));
  });
});
