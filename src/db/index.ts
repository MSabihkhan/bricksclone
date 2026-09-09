import { SQLiteDriver } from './native/SQLiteDriver';
import { runMigrations } from './migrate';
import { TagRepository } from './repositories/TagRepository';
import { BlockedAppsRepository } from './repositories/BlockedAppsRepository';
import { SessionRepository } from './repositories/SessionRepository';
import { BlockedAttemptRepository } from './repositories/BlockedAttemptRepository';
import { SettingsRepository } from './repositories/SettingsRepository';

class Database {
  private driver: SQLiteDriver | null = null;
  private initPromise: Promise<void> | null = null;

  private _tags: TagRepository | null = null;
  private _blockedApps: BlockedAppsRepository | null = null;
  private _sessions: SessionRepository | null = null;
  private _blockedAttempts: BlockedAttemptRepository | null = null;
  private _settings: SettingsRepository | null = null;

  /**
   * Guards against overlapping callers (there are two: App's own boot effect, and every
   * screen's isOnboarded()/completeOnboarding() calls) racing each other. The previous
   * `if (this.driver) return` guard returned success for a second caller the instant the
   * first one had merely *started* — before migrations ran or the repositories existed —
   * so a fast-firing second caller could treat the database as ready when it was not.
   */
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.driver = new SQLiteDriver();
      await this.driver.open();
      await runMigrations(this.driver);

      this._tags = new TagRepository(this.driver);
      this._blockedApps = new BlockedAppsRepository(this.driver);
      this._sessions = new SessionRepository(this.driver);
      this._blockedAttempts = new BlockedAttemptRepository(this.driver);
      this._settings = new SettingsRepository(this.driver);
    })();

    try {
      await this.initPromise;
    } catch (err) {
      // Let the next caller retry instead of permanently remembering this failed attempt.
      this.initPromise = null;
      this.driver = null;
      throw err;
    }
  }

  private require<T>(value: T | null, name: string): T {
    if (value === null) {
      throw new Error(`db.${name} used before db.init() finished (or it failed) — every screen must await db.init() before touching the database.`);
    }
    return value;
  }

  get tags(): TagRepository { return this.require(this._tags, 'tags'); }
  get blockedApps(): BlockedAppsRepository { return this.require(this._blockedApps, 'blockedApps'); }
  get sessions(): SessionRepository { return this.require(this._sessions, 'sessions'); }
  get blockedAttempts(): BlockedAttemptRepository { return this.require(this._blockedAttempts, 'blockedAttempts'); }
  get settings(): SettingsRepository { return this.require(this._settings, 'settings'); }

  getDriver(): SQLiteDriver {
    if (!this.driver) throw new Error('db.getDriver() used before db.init() finished (or it failed).');
    return this.driver;
  }
}

export const db = new Database();
