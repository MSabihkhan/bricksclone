import { DbDriver, Row } from '../Driver';
import { BlockedAttempt } from '../types';

export class BlockedAttemptRepository {
  constructor(private driver: DbDriver) {}

  private mapRowToBlockedAttempt(row: Row): BlockedAttempt {
    return {
      id: Number(row.id),
      sessionId: Number(row.session_id),
      packageName: String(row.package_name),
      label: String(row.label),
      createdAt: Number(row.created_at),
    };
  }

  async recordAttempt(input: Omit<BlockedAttempt, 'id'>): Promise<void> {
    await this.driver.execute(
      'INSERT INTO blocked_attempts (session_id, package_name, label, created_at) VALUES (?, ?, ?, ?)',
      [input.sessionId, input.packageName, input.label, input.createdAt]
    );
  }

  async attemptsForSession(sessionId: number): Promise<BlockedAttempt[]> {
    const rows = await this.driver.query(
      'SELECT * FROM blocked_attempts WHERE session_id = ? ORDER BY created_at DESC',
      [sessionId]
    );
    return rows.map(r => this.mapRowToBlockedAttempt(r));
  }

  async countTotal(): Promise<number> {
    const row = await this.driver.get('SELECT COUNT(*) as count FROM blocked_attempts');
    return row ? Number(row.count) : 0;
  }
}
