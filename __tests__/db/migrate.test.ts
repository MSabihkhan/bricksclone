import { SqlJsDriver } from './helpers';
import { runMigrations } from '../../src/db/migrate';
import { LATEST_VERSION } from '../../src/db/migrations';

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
