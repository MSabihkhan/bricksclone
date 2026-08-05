import { SQLiteDriver } from './native/SQLiteDriver';
import { TagRepository } from './repositories/TagRepository';
import { BlockedAppsRepository } from './repositories/BlockedAppsRepository';
import { SessionRepository } from './repositories/SessionRepository';
import { BlockedAttemptRepository } from './repositories/BlockedAttemptRepository';
import { SettingsRepository } from './repositories/SettingsRepository';

class Database {
  private driver: SQLiteDriver | null = null;
  
  public tags!: TagRepository;
  public blockedApps!: BlockedAppsRepository;
  public sessions!: SessionRepository;
  public blockedAttempts!: BlockedAttemptRepository;
  public settings!: SettingsRepository;

  async init(): Promise<void> {
    if (this.driver) return;
    this.driver = new SQLiteDriver();
    await this.driver.open();
    
    const { runMigrations } = await import('./migrate');
    await runMigrations(this.driver);

    
    this.tags = new TagRepository(this.driver);
    this.blockedApps = new BlockedAppsRepository(this.driver);
    this.sessions = new SessionRepository(this.driver);
    this.blockedAttempts = new BlockedAttemptRepository(this.driver);
    this.settings = new SettingsRepository(this.driver);
  }
  
  getDriver(): SQLiteDriver {
    if (!this.driver) throw new Error('Database not initialized');
    return this.driver;
  }
}

export const db = new Database();
