import { MIGRATIONS, LATEST_VERSION } from './migrations';
import { DbDriver } from './Driver';

export async function runMigrations(driver: DbDriver): Promise<number> {
  let currentVersion = 0;
  try {
    const row = await driver.get<{value: string}>('SELECT value FROM settings WHERE key = ?', ['schema_version']);
    if (row) {
      currentVersion = Number(row.value) || 0;
    }
  } catch {
    currentVersion = 0;
  }

  if (currentVersion >= LATEST_VERSION) {
    return LATEST_VERSION;
  }

  await driver.withTransaction(async () => {
    for (let i = currentVersion; i < LATEST_VERSION; i++) {
      await driver.execute(MIGRATIONS[i]);
    }
    await driver.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['schema_version', String(LATEST_VERSION)]
    );
  });

  return LATEST_VERSION;
}
