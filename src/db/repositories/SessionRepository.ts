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
      routineType: String(row.routine_type || 'study'),
      intention: row.intention ? String(row.intention) : null,
      outcome: row.outcome ? String(row.outcome) as Session['outcome'] : null,
      nextStep: row.next_step ? String(row.next_step) : null,
      laterNote: row.later_note ? String(row.later_note) : null,
    };
  }

  async startSession(input: Omit<Session, 'id' | 'endTime' | 'durationSec' | 'endedVia' | 'outcome' | 'nextStep' | 'laterNote' | 'routineType' | 'intention'> & Partial<Pick<Session, 'routineType' | 'intention'>>): Promise<number> {
    const result = await this.driver.execute(
      `INSERT INTO sessions (tag_id, start_time, planned_end_time, strict, apps, routine_type, intention) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [input.tagId, input.startTime, input.plannedEndTime ?? null, input.strict, JSON.stringify(input.apps), input.routineType ?? 'study', input.intention ?? null]
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

  /**
   * Sessions with any time inside [start, end): ones that started before the range but ran
   * into it count too. Stats use this; `sessionsBetween` only sees sessions that *started*
   * in the range, which loses the part of an overnight session that falls on the next day.
   */
  async sessionsOverlapping(start: number, end: number): Promise<Session[]> {
    const rows = await this.driver.query(
      `SELECT * FROM sessions
       WHERE start_time < ? AND (end_time IS NULL OR end_time > ?)
       ORDER BY start_time DESC`,
      [end, start]
    );
    return rows.map(r => this.mapRowToSession(r));
  }

  /**
   * Latest finished session still waiting for a done / partial / not done answer.
   * `routineTypes` limits this to rituals that ask for one — without it, bedtime, family
   * and prayer sessions were being graded too.
   */
  async getPendingOutcome(routineTypes?: string[]): Promise<Session | undefined> {
    if (routineTypes && routineTypes.length === 0) return undefined;
    const typeFilter = routineTypes ? `AND routine_type IN (${routineTypes.map(() => '?').join(', ')})` : '';
    const row = await this.driver.get(
      `SELECT * FROM sessions
       WHERE end_time IS NOT NULL AND ended_via != 'start_failed' AND intention IS NOT NULL AND TRIM(intention) != '' AND outcome IS NULL
       ${typeFilter}
       ORDER BY end_time DESC LIMIT 1`,
      routineTypes ?? []
    );
    return row ? this.mapRowToSession(row) : undefined;
  }

  async saveOutcome(id: number, input: { outcome: NonNullable<Session['outcome']>; nextStep: string }): Promise<void> {
    await this.driver.execute(
      'UPDATE sessions SET outcome = ?, next_step = ? WHERE id = ?',
      [input.outcome, input.nextStep.trim() || null, id]
    );
  }

  async saveLaterNote(id: number, note: string): Promise<void> {
    await this.driver.execute('UPDATE sessions SET later_note = ? WHERE id = ?', [note.trim() || null, id]);
  }
}
