import initSqlJs, { Database } from 'sql.js';
import { DbDriver, DbResult, Row } from '../../src/db/Driver';
import { MIGRATIONS } from '../../src/db/migrations';

export class SqlJsDriver implements DbDriver {
  private db: Database | null = null;

  async open(): Promise<void> {
    const SQL = await initSqlJs();
    this.db = new SQL.Database();
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<DbResult> {
    if (!this.db) throw new Error('Database not open');
    
    // sql.js doesn't provide rowsAffected or insertId out of the box nicely for all queries,
    // but we can approximate it or just run it.
    this.db.run(sql, params as any[]);
    
    // Try to get insert id if it was an insert
    let insertId: number | undefined;
    if (sql.trim().toUpperCase().startsWith('INSERT')) {
      const res = this.db.exec('SELECT last_insert_rowid()');
      if (res.length > 0 && res[0].values.length > 0) {
        insertId = res[0].values[0][0] as number;
      }
    }

    return {
      rowsAffected: this.db.getRowsModified(),
      insertId,
    };
  }

  async query<T = Row>(sql: string, params?: unknown[]): Promise<T[]> {
    if (!this.db) throw new Error('Database not open');
    const stmt = this.db.prepare(sql);
    if (params) {
      stmt.bind(params as any[]);
    }
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    stmt.free();
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

export async function createTestDatabase(): Promise<SqlJsDriver> {
  const driver = new SqlJsDriver();
  await driver.open();
  
  for (const migration of MIGRATIONS) {
    await driver.execute(migration);
  }
  
  return driver;
}
it('is a helper file', () => { expect(true).toBe(true); });
