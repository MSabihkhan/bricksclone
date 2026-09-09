const mockOpen = jest.fn();

jest.mock('../../src/db/native/SQLiteDriver', () => ({
  SQLiteDriver: jest.fn().mockImplementation(() => ({
    open: mockOpen,
    execute: jest.fn().mockResolvedValue({ rowsAffected: 0 }),
    query: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(undefined),
    withTransaction: jest.fn((fn: () => Promise<unknown>) => fn()),
    isOpen: jest.fn().mockReturnValue(true),
  })),
}));

describe('db singleton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('throws a specific error from each repository getter before init() has completed', async () => {
    const { db } = require('../../src/db');
    expect(() => db.tags).toThrow(/db\.tags used before db\.init\(\)/);
    expect(() => db.sessions).toThrow(/db\.sessions used before db\.init\(\)/);
  });

  it('runs the open+migrate sequence exactly once for callers racing init()', async () => {
    mockOpen.mockResolvedValue(undefined);
    const { db } = require('../../src/db');
    const { SQLiteDriver } = require('../../src/db/native/SQLiteDriver');

    // Two callers firing before either resolves used to both pass the old truthiness
    // guard and race — the second saw a half-initialized instance. This is the scenario
    // that was actually happening between App's boot effect and isOnboarded().
    await Promise.all([db.init(), db.init()]);

    expect(SQLiteDriver).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(db.tags).toBeDefined();
  });

  it('leaves the database usable for a retry after init() fails', async () => {
    mockOpen.mockRejectedValueOnce(new Error('native module unavailable'));
    const { db } = require('../../src/db');

    await expect(db.init()).rejects.toThrow('native module unavailable');
    expect(() => db.tags).toThrow(/db\.tags used before db\.init\(\)/);

    mockOpen.mockResolvedValueOnce(undefined);
    await db.init();
    expect(db.tags).toBeDefined();
  });
});
