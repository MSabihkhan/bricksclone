import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';
import { DbDriver, DbResult, Row } from '../Driver';

SQLite.enablePromise(true);

export class SQLiteDriver implements DbDriver {
  private db: SQLiteDatabase | null = null;
  private readonly dbName: string;

  constructor(dbName: string = 'bricks.db') {
    this.dbName = dbName;
  }

  async open(): Promise<void> {
    if (this.db) return;
    this.db = await SQLite.openDatabase({
      name: this.dbName,
      location: 'default',
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<DbResult> {
    if (!this.db) throw new Error('Database not open');
    const [result] = await this.db.executeSql(sql, params);
    return {
      rowsAffected: result.rowsAffected,
      insertId: result.insertId,
    };
  }

  async query<T = Row>(sql: string, params?: unknown[]): Promise<T[]> {
    if (!this.db) throw new Error('Database not open');
    const [result] = await this.db.executeSql(sql, params);
    const rows: T[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(result.rows.item(i) as T);
    }
    return rows;
  }

  async get<T = Row>(sql: string, params?: unknown[]): Promise<T | undefined> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : undefined;
  }

  async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.db) throw new Error('Database not open');
    await this.execute('BEGIN TRANSACTION');
    try {
      const result = await fn();
      await this.execute('COMMIT');
      return result;
    } catch (e) {
      await this.execute('ROLLBACK');
      throw e;
    }
  }

  isOpen(): boolean {
    return this.db !== null;
  }
}
