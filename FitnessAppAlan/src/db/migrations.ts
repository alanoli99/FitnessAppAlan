import { SQLiteDatabase } from "expo-sqlite";

async function getTableColumns(db: SQLiteDatabase, tableName: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  return rows.map((row) => row.name.toLowerCase());
}

async function tableExists(db: SQLiteDatabase, tableName: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = ?",
    [tableName],
  );
  return (row?.count ?? 0) > 0;
}

async function resetLegacyPlanTables(db: SQLiteDatabase): Promise<void> {
  const exists = await tableExists(db, "program_days");
  if (!exists) {
    return;
  }

  const columns = await getTableColumns(db, "program_days");
  const hasNewShape = columns.includes("week") && columns.includes("day") && columns.includes("json");
  if (hasNewShape) {
    return;
  }

  await db.execAsync(`
    DROP TABLE IF EXISTS exercise_status;
    DROP TABLE IF EXISTS set_entry;
    DROP TABLE IF EXISTS session;
    DROP TABLE IF EXISTS exercise_item;
    DROP TABLE IF EXISTS set_logs;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS day_exercises;
    DROP TABLE IF EXISTS exercises;
    DROP TABLE IF EXISTS program_weeks;
    DROP TABLE IF EXISTS program_days;
  `);
}

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await resetLegacyPlanTables(db);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS program_days (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      week INTEGER NOT NULL,
      day INTEGER NOT NULL,
      json TEXT
    );

    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY NOT NULL,
      program_day_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      status TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (program_day_id) REFERENCES program_days(id)
    );

    CREATE TABLE IF NOT EXISTS exercise_item (
      id TEXT PRIMARY KEY NOT NULL,
      program_day_id TEXT NOT NULL,
      block TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      name TEXT NOT NULL,
      prescription_json TEXT NOT NULL,
      FOREIGN KEY (program_day_id) REFERENCES program_days(id)
    );

    CREATE TABLE IF NOT EXISTS set_entry (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      exercise_item_id TEXT NOT NULL,
      set_index INTEGER NOT NULL,
      weight REAL,
      reps INTEGER,
      rpe REAL,
      rir INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(id),
      FOREIGN KEY (exercise_item_id) REFERENCES exercise_item(id)
    );

    CREATE TABLE IF NOT EXISTS exercise_status (
      session_id TEXT NOT NULL,
      exercise_item_id TEXT NOT NULL,
      status TEXT NOT NULL,
      skip_reason TEXT,
      PRIMARY KEY (session_id, exercise_item_id),
      FOREIGN KEY (session_id) REFERENCES session(id),
      FOREIGN KEY (exercise_item_id) REFERENCES exercise_item(id)
    );

    CREATE INDEX IF NOT EXISTS idx_set_entry_session ON set_entry(session_id);
    CREATE INDEX IF NOT EXISTS idx_set_entry_exercise_item ON set_entry(exercise_item_id);
    CREATE INDEX IF NOT EXISTS idx_exercise_item_day ON exercise_item(program_day_id);
    CREATE INDEX IF NOT EXISTS idx_session_day_status ON session(program_day_id, status);
  `);
}
