import { MIGRATIONS, LATEST_VERSION } from './migrations';
import { DbDriver } from './Driver';

/**
 * Each entry in MIGRATIONS is a block of several `CREATE TABLE` statements written as one
 * string for readability. That works against the `sql.js` driver used in tests (`db.run()`
 * batches multiple statements), but on Android, react-native-sqlite-storage compiles SQL
 * via `sqlite3_prepare_v2`, which only compiles the *first* statement in a string and
 * silently drops the rest — so only the first table in each block was ever actually
 * created. Splitting into individual statements here executes correctly on both.
 */
export function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
}

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
      for (const statement of splitStatements(MIGRATIONS[i])) {
        await driver.execute(statement);
      }
    }
    await driver.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['schema_version', String(LATEST_VERSION)]
    );
  });

  return LATEST_VERSION;
}
