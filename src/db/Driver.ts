export type Row = Record<string, unknown>;

export interface DbResult {
  rowsAffected: number;
  insertId?: number;
}

export interface DbDriver {
  open(): Promise<void>;
  close(): Promise<void>;
  execute(sql: string, params?: unknown[]): Promise<DbResult>;
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = Row>(sql: string, params?: unknown[]): Promise<T | undefined>;
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
  isOpen(): boolean;
}
