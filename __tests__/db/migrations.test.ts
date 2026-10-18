import { runMigrations } from '../../src/db/migrate';
import { SqlJsDriver } from './helpers';
import { MIGRATIONS, LATEST_VERSION } from '../../src/db/migrations';
import { SettingsRepository } from '../../src/db/repositories/SettingsRepository';

describe('Migrations', () => {
  let driver: SqlJsDriver;

  beforeEach(async () => {
    driver = new SqlJsDriver();
    await driver.open();
  });

  afterEach(async () => {
    await driver.close();
  });

  async function getDbVersion(): Promise<number> {
    const settings = new SettingsRepository(driver);
    const versionStr = await settings.get('schema_version');
    return versionStr ? parseInt(versionStr, 10) : 0;
  }

  async function setDbVersion(version: number): Promise<void> {
    const settings = new SettingsRepository(driver);
    await driver.execute(
      'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)'
    );
    await settings.set('schema_version', version.toString());
  }

  it('applies migrations in order to create all tables', async () => {
    // Apply migrations
    for (const migration of MIGRATIONS) {
      await driver.execute(migration);
    }
    await setDbVersion(LATEST_VERSION);

    // Check if tables exist
    const tables = await driver.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
    );
    
    const tableNames = tables.map(t => t.name).sort();
    expect(tableNames).toEqual([
      'blocked_apps',
      'blocked_attempts',
      'sessions',
      'settings',
      'tags',
    ]);
  });

  it('is idempotent on re-open', async () => {
    // Raw migrations are not re-runnable (ALTER TABLE ADD COLUMN fails twice); the
    // versioned runner is what guarantees each one is applied exactly once.
    await runMigrations(driver);
    await runMigrations(driver);
    const version = await getDbVersion();
    expect(version).toBe(LATEST_VERSION);
  });
});
