import { DbDriver, Row } from '../Driver';
import { BlockedApp } from '../types';

export class BlockedAppsRepository {
  constructor(private driver: DbDriver) {}

  private mapRowToBlockedApp(row: Row): BlockedApp {
    return {
      packageName: String(row.package_name),
      label: String(row.label),
      addedAt: Number(row.added_at),
    };
  }

  async listBlockedApps(): Promise<BlockedApp[]> {
    const rows = await this.driver.query('SELECT * FROM blocked_apps ORDER BY added_at DESC');
    return rows.map(r => this.mapRowToBlockedApp(r));
  }

  async addBlockedApp(app: BlockedApp): Promise<void> {
    await this.driver.execute(
      'INSERT OR REPLACE INTO blocked_apps (package_name, label, added_at) VALUES (?, ?, ?)',
      [app.packageName, app.label, app.addedAt]
    );
  }

  async removeBlockedApp(packageName: string): Promise<void> {
    await this.driver.execute('DELETE FROM blocked_apps WHERE package_name = ?', [packageName]);
  }

  async replaceAll(apps: BlockedApp[]): Promise<void> {
    await this.driver.withTransaction(async () => {
      await this.driver.execute('DELETE FROM blocked_apps');
      for (const app of apps) {
        await this.addBlockedApp(app);
      }
    });
  }
}
