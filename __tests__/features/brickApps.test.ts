import { appsForBrick, usesOwnList } from '../../src/features/brickApps';

describe('appsForBrick', () => {
  const main = ['com.instagram.android', 'com.google.android.youtube'];

  it('uses the Brick’s own list when it has one', () => {
    expect(appsForBrick({ apps: ['com.whatsapp'] }, main)).toEqual(['com.whatsapp']);
  });

  it('falls back to the main list for keys without one', () => {
    expect(appsForBrick({ apps: null }, main)).toEqual(main);
    expect(appsForBrick(undefined, main)).toEqual(main);
  });

  it('never starts a session that blocks nothing because of an empty custom list', () => {
    expect(appsForBrick({ apps: [] }, main)).toEqual(main);
    expect(usesOwnList({ apps: [] })).toBe(false);
  });
});
