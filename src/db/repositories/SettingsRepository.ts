import { DbDriver } from '../Driver';

export class SettingsRepository {
  constructor(private driver: DbDriver) {}

  async get(key: string): Promise<string | undefined> {
    const row = await this.driver.get('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? String(row.value) : undefined;
  }

  async set(key: string, value: string): Promise<void> {
    await this.driver.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.driver.query('SELECT * FROM settings');
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[String(row.key)] = String(row.value);
    }
    return result;
  }
}
