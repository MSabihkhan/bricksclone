import { SqlJsDriver } from './helpers';
import { runMigrations, splitStatements } from '../../src/db/migrate';
import { MIGRATIONS, LATEST_VERSION } from '../../src/db/migrations';
import { DbDriver } from '../../src/db/Driver';

describe('splitStatements', () => {
  it('splits a semicolon-delimited block into individual statements', () => {
    expect(splitStatements('CREATE TABLE a (x INT); CREATE TABLE b (y INT);')).toEqual([
      'CREATE TABLE a (x INT)',
      'CREATE TABLE b (y INT)',
    ]);
  });

  it('drops empty segments from trailing separators and blank lines', () => {
    expect(splitStatements('CREATE TABLE a (x INT);\n\n  ;\n')).toEqual(['CREATE TABLE a (x INT)']);
  });
});

describe('runMigrations executes one statement per driver.execute() call', () => {
  it('never hands the native driver a semicolon-joined multi-statement string', async () => {
    // This is the regression test for the actual bug: react-native-sqlite-storage compiles
    // SQL via sqlite3_prepare_v2, which silently runs only the *first* statement in a
    // string and drops the rest. Passing the whole MIGRATIONS[i] block in one execute()
    // call created `tags` and quietly never created `blocked_apps`, `sessions`,
    // `blocked_attempts`, or `settings` — every write to those tables then failed with
    // "no such table" on a real device, while the sql.js test double (which batches
    // multi-statement strings) never caught it. Asserting the exact SQL each call
    // receives, not just the end state, is what would have caught it.
    const calls: string[] = [];
    const driver: DbDriver = {
      open: jest.fn(),
      close: jest.fn(),
      isOpen: jest.fn().mockReturnValue(true),
      get: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue([]),
      execute: jest.fn((sql: string) => { calls.push(sql); return Promise.resolve({ rowsAffected: 0 }); }),
      withTransaction: <T>(fn: () => Promise<T>) => fn(),
    };

    await runMigrations(driver);

    const expectedStatementCount = MIGRATIONS.reduce((n, block) => n + splitStatements(block).length, 0);
    // +1 for the schema_version bookkeeping insert.
    expect(calls.length).toBe(expectedStatementCount + 1);
    for (const sql of calls) {
      expect(sql.trim().replace(/;$/, '')).not.toMatch(/;\s*\S/);
    }
  });
});

describe('runMigrations', () => {
  it('runs on fresh db and applies all migrations', async () => {
    const driver = new SqlJsDriver();
    await driver.open();

    const version = await runMigrations(driver);
    expect(version).toBe(LATEST_VERSION);

    const tablesRes = await driver.query<{name: string}>("SELECT name FROM sqlite_master WHERE type='table'");
    const tables = tablesRes.map((r) => r.name);

    expect(tables).toContain('tags');
    expect(tables).toContain('blocked_apps');
    expect(tables).toContain('sessions');
    expect(tables).toContain('blocked_attempts');
    expect(tables).toContain('settings');

    const versionRes = await driver.get<{value: string}>("SELECT value FROM settings WHERE key = 'schema_version'");
    expect(versionRes?.value).toBe(String(LATEST_VERSION));
  });

  it('is idempotent when run again', async () => {
    const driver = new SqlJsDriver();
    await driver.open();

    await runMigrations(driver);
    const version = await runMigrations(driver);

    expect(version).toBe(LATEST_VERSION);
  });

  it('applies partial migrations', async () => {
    const driver = new SqlJsDriver();
    await driver.open();

    await driver.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    await driver.execute("INSERT INTO settings (key, value) VALUES ('schema_version', '0')");

    const version = await runMigrations(driver);
    expect(version).toBe(LATEST_VERSION);

    const tablesRes = await driver.query<{name: string}>("SELECT name FROM sqlite_master WHERE type='table'");
    const tables = tablesRes.map((r) => r.name);

    expect(tables).toContain('tags');
  });
});
