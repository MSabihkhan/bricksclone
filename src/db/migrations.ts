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
    planned_end_time INTEGER,
    ended_via TEXT CHECK(ended_via IN ('nfc','timer','override','force_kill','service_kill','start_failed')),
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
  `,
  `
  CREATE TABLE sessions_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id TEXT,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    duration_sec INTEGER,
    planned_end_time INTEGER,
    ended_via TEXT CHECK(ended_via IN ('nfc','timer','override','force_kill','service_kill','start_failed')),
    strict INTEGER NOT NULL DEFAULT 1,
    apps TEXT NOT NULL DEFAULT '[]'
  );

  INSERT INTO sessions_v2 (id, tag_id, start_time, end_time, duration_sec, planned_end_time, ended_via, strict, apps)
  SELECT id, tag_id, start_time, end_time, duration_sec, NULL, ended_via, strict, apps FROM sessions;

  DROP TABLE sessions;
  ALTER TABLE sessions_v2 RENAME TO sessions;

  UPDATE sessions
  SET end_time = start_time, duration_sec = 0, ended_via = 'service_kill'
  WHERE end_time IS NULL AND id NOT IN (SELECT MAX(id) FROM sessions WHERE end_time IS NULL);

  CREATE UNIQUE INDEX idx_one_active_session ON sessions ((1)) WHERE end_time IS NULL;
  DELETE FROM blocked_attempts
  WHERE id NOT IN (
    SELECT MIN(id) FROM blocked_attempts GROUP BY session_id, package_name, created_at
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_blocked_attempt ON blocked_attempts (session_id, package_name, created_at);
  `,
  `
  ALTER TABLE sessions ADD COLUMN routine_type TEXT NOT NULL DEFAULT 'study';
  ALTER TABLE sessions ADD COLUMN intention TEXT;
  ALTER TABLE sessions ADD COLUMN outcome TEXT CHECK(outcome IN ('done','partial','not_done'));
  ALTER TABLE sessions ADD COLUMN next_step TEXT;
  ALTER TABLE sessions ADD COLUMN later_note TEXT;
  `,
  `
  -- Per-key block list as a JSON array of package names. NULL = use the main list.
  ALTER TABLE tags ADD COLUMN apps TEXT;
  `
];

export const LATEST_VERSION = MIGRATIONS.length;
