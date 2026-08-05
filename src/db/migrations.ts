export const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    mode TEXT NOT NULL DEFAULT 'deep',
    categories TEXT NOT NULL DEFAULT '{}',
    duration TEXT NOT NULL DEFAULT '50',
    strict INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS blocked_apps (
    package_name TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    added_at INTEGER NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id TEXT,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    duration_sec INTEGER,
    ended_via TEXT CHECK(ended_via IN ('nfc','override','force_kill','service_kill')),
    strict INTEGER NOT NULL DEFAULT 1,
    apps TEXT NOT NULL DEFAULT '[]'
  );
  
  CREATE TABLE IF NOT EXISTS blocked_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    package_name TEXT NOT NULL,
    label TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `
];

export const LATEST_VERSION = MIGRATIONS.length;
