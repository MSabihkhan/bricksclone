import { DbDriver, Row } from '../Driver';
import { Session } from '../types';

export class SessionRepository {
  constructor(private driver: DbDriver) {}

  private mapRowToSession(row: Row): Session {
    return {
      id: Number(row.id),
      tagId: row.tag_id ? String(row.tag_id) : null,
      startTime: Number(row.start_time),
      endTime: row.end_time ? Number(row.end_time) : null,
      durationSec: row.duration_sec ? Number(row.duration_sec) : null,
      plannedEndTime: row.planned_end_time ? Number(row.planned_end_time) : null,
      endedVia: row.ended_via ? String(row.ended_via) : null,
      strict: Number(row.strict),
      apps: JSON.parse(String(row.apps || '[]')),
    };
  }

  async startSession(input: Omit<Session, 'id' | 'endTime' | 'durationSec' | 'endedVia'>): Promise<number> {
    const result = await this.driver.execute(
      `INSERT INTO sessions (tag_id, start_time, planned_end_time, strict, apps) VALUES (?, ?, ?, ?, ?)`,
      [input.tagId, input.startTime, input.plannedEndTime ?? null, input.strict, JSON.stringify(input.apps)]
    );
    if (!result.insertId) throw new Error('Failed to insert session');
    return result.insertId;
  }

  async endSession(id: number, input: { endedVia: string; durationSec: number; endTime?: number }): Promise<void> {
    const endTime = input.endTime ?? Math.floor(Date.now() / 1000);
    await this.driver.execute(
      `UPDATE sessions SET end_time = ?, duration_sec = ?, ended_via = ? WHERE id = ?`,
      [endTime, input.durationSec, input.endedVia, id]
    );
  }

  async getSessionById(id: number): Promise<Session | undefined> {
    const row = await this.driver.get('SELECT * FROM sessions WHERE id = ?', [id]);
    return row ? this.mapRowToSession(row) : undefined;
  }

  async getActiveSession(): Promise<Session | undefined> {
    const row = await this.driver.get('SELECT * FROM sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1');
    return row ? this.mapRowToSession(row) : undefined;
  }

  async listSessions(): Promise<Session[]> {
    const rows = await this.driver.query('SELECT * FROM sessions ORDER BY start_time DESC');
    return rows.map(r => this.mapRowToSession(r));
  }

  async sessionsBetween(start: number, end: number): Promise<Session[]> {
    const rows = await this.driver.query(
      'SELECT * FROM sessions WHERE start_time >= ? AND start_time <= ? ORDER BY start_time DESC',
      [start, end]
    );
    return rows.map(r => this.mapRowToSession(r));
  }
}
