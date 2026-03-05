import { SQLiteDatabase } from "expo-sqlite";

import { ExerciseProgress, ProgramDayDetails, ProgramDaySummary, ProgramExercise, SessionDetail, SessionRecord, SessionSetDetail, SessionSummary, SetEntry, TodayWorkout } from "../types/program";

const SETTING_PROGRAM_START_DATE = "program_start_date";

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value ?? null;
}

async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

export async function getProgramStartDate(db: SQLiteDatabase): Promise<string> {
  const existing = await getSetting(db, SETTING_PROGRAM_START_DATE);
  if (existing) {
    return existing;
  }
  const fallback = localDateKey(new Date());
  await setSetting(db, SETTING_PROGRAM_START_DATE, fallback);
  return fallback;
}

export async function updateProgramStartDate(db: SQLiteDatabase, value: string): Promise<void> {
  await setSetting(db, SETTING_PROGRAM_START_DATE, value);
}

export async function listProgramDays(db: SQLiteDatabase): Promise<ProgramDaySummary[]> {
  const rows = await db.getAllAsync<ProgramDaySummary>(
    `
      SELECT id, week AS weekNumber, day AS dayNumber, name, json
      FROM program_days
      ORDER BY week ASC, day ASC
    `,
  );
  return rows;
}

export async function getTodayWorkout(db: SQLiteDatabase, now: Date = new Date()): Promise<TodayWorkout | null> {
  const days = await listProgramDays(db);
  if (days.length === 0) {
    return null;
  }

  const startDateRaw = await getProgramStartDate(db);
  const startDate = new Date(`${startDateRaw}T00:00:00`);
  const nowDate = new Date(`${localDateKey(now)}T00:00:00`);
  const elapsedDays = Math.max(0, Math.floor((nowDate.getTime() - startDate.getTime()) / 86_400_000));
  const cycleDayIndex = elapsedDays % days.length;
  const selected = days[cycleDayIndex];
  return {
    ...selected,
    cycleDayIndex,
    totalProgramDays: days.length,
  };
}

export async function listExerciseItemsForDay(db: SQLiteDatabase, programDayId: string): Promise<ProgramExercise[]> {
  const rows = await db.getAllAsync<{
    exerciseItemId: string;
    programDayId: string;
    block: "warmup" | "main" | "accessory" | "cardio";
    orderIndex: number;
    name: string;
    prescriptionJson: string;
  }>(
    `
      SELECT
        id AS exerciseItemId,
        program_day_id AS programDayId,
        block,
        order_index AS orderIndex,
        name,
        prescription_json AS prescriptionJson
      FROM exercise_item
      WHERE program_day_id = ?
      ORDER BY order_index ASC
    `,
    [programDayId],
  );

  return rows.map((row) => {
    const parsed = JSON.parse(row.prescriptionJson) as ProgramExercise["prescriptionJson"] & { plannedSetCount?: number };
    return {
      ...row,
      prescriptionJson: parsed,
      plannedSetCount: parsed.plannedSetCount ?? 0,
    };
  });
}

export async function getProgramDayDetails(db: SQLiteDatabase, dayId: string): Promise<ProgramDayDetails | null> {
  const day = await db.getFirstAsync<ProgramDaySummary>(
    "SELECT id, week AS weekNumber, day AS dayNumber, name, json FROM program_days WHERE id = ?",
    [dayId],
  );
  if (!day) {
    return null;
  }
  const exercises = await listExerciseItemsForDay(db, dayId);
  return { ...day, exercises };
}

export async function getActiveSessionForDay(db: SQLiteDatabase, dayId: string): Promise<SessionRecord | null> {
  const row = await db.getFirstAsync<SessionRecord>(
    `
      SELECT
        id,
        program_day_id AS programDayId,
        started_at AS startedAt,
        ended_at AS endedAt,
        status,
        notes
      FROM session
      WHERE program_day_id = ? AND status = 'active'
      ORDER BY started_at DESC
      LIMIT 1
    `,
    [dayId],
  );
  return row ?? null;
}

export async function ensureOpenSessionForDay(db: SQLiteDatabase, dayId: string): Promise<string> {
  const existing = await getActiveSessionForDay(db, dayId);
  if (existing) {
    return existing.id;
  }
  const id = newId("sess");
  await db.runAsync(
    "INSERT INTO session (id, program_day_id, started_at, ended_at, status, notes) VALUES (?, ?, ?, NULL, 'active', NULL)",
    [id, dayId, Date.now()],
  );
  return id;
}

export async function completeSession(db: SQLiteDatabase, sessionId: string): Promise<void> {
  await db.runAsync("UPDATE session SET status = 'completed', ended_at = ? WHERE id = ?", [Date.now(), sessionId]);
}

export async function getSetEntriesForExercise(db: SQLiteDatabase, sessionId: string, exerciseItemId: string): Promise<SetEntry[]> {
  const rows = await db.getAllAsync<SetEntry>(
    `
      SELECT
        id,
        session_id AS sessionId,
        exercise_item_id AS exerciseItemId,
        set_index AS setIndex,
        weight,
        reps,
        rpe,
        rir,
        created_at AS createdAt
      FROM set_entry
      WHERE session_id = ? AND exercise_item_id = ?
      ORDER BY set_index ASC
    `,
    [sessionId, exerciseItemId],
  );
  return rows;
}

export async function getExerciseSetCount(db: SQLiteDatabase, sessionId: string, exerciseItemId: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM set_entry WHERE session_id = ? AND exercise_item_id = ?",
    [sessionId, exerciseItemId],
  );
  return row?.count ?? 0;
}

export async function getProgressByExerciseId(db: SQLiteDatabase, sessionId: string): Promise<ExerciseProgress[]> {
  const rows = await db.getAllAsync<ExerciseProgress>(
    `
      SELECT
        exercise_item_id AS exerciseItemId,
        COUNT(*) AS setCount
      FROM set_entry
      WHERE session_id = ?
      GROUP BY exercise_item_id
    `,
    [sessionId],
  );
  return rows;
}

export async function addSetEntry(
  db: SQLiteDatabase,
  input: { sessionId: string; exerciseItemId: string; weight: number | null; reps: number | null; rpe: number | null; rir?: number | null },
): Promise<void> {
  const next = await db.getFirstAsync<{ nextIndex: number }>(
    `
      SELECT COALESCE(MAX(set_index), -1) + 1 AS nextIndex
      FROM set_entry
      WHERE session_id = ? AND exercise_item_id = ?
    `,
    [input.sessionId, input.exerciseItemId],
  );

  await db.runAsync(
    `
      INSERT INTO set_entry (id, session_id, exercise_item_id, set_index, weight, reps, rpe, rir, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      newId("set"),
      input.sessionId,
      input.exerciseItemId,
      next?.nextIndex ?? 0,
      input.weight,
      input.reps,
      input.rpe,
      input.rir ?? null,
      Date.now(),
    ],
  );
}

export async function listRecentSessions(db: SQLiteDatabase, limit = 30): Promise<SessionSummary[]> {
  const rows = await db.getAllAsync<SessionSummary>(
    `
      SELECT
        s.id,
        d.name AS dayName,
        s.started_at AS performedAt,
        s.status,
        COUNT(se.id) AS totalSets
      FROM session s
      INNER JOIN program_days d ON d.id = s.program_day_id
      LEFT JOIN set_entry se ON se.session_id = s.id
      GROUP BY s.id, d.name, s.started_at, s.status
      ORDER BY s.started_at DESC
      LIMIT ?
    `,
    [limit],
  );
  return rows;
}


export async function getSessionDetail(db: SQLiteDatabase, sessionId: string): Promise<SessionDetail | null> {
  const row = await db.getFirstAsync<SessionDetail>(
    `
      SELECT
        s.id,
        d.name AS dayName,
        d.week AS weekNumber,
        d.day AS dayNumber,
        s.started_at AS startedAt,
        s.ended_at AS endedAt,
        s.status,
        s.notes
      FROM session s
      INNER JOIN program_days d ON d.id = s.program_day_id
      WHERE s.id = ?
    `,
    [sessionId],
  );
  return row ?? null;
}

export async function getSessionSets(db: SQLiteDatabase, sessionId: string): Promise<SessionSetDetail[]> {
  const rows = await db.getAllAsync<SessionSetDetail>(
    `
      SELECT
        ei.id AS exerciseItemId,
        ei.name AS exerciseName,
        ei.block,
        ei.order_index AS orderIndex,
        se.set_index AS setIndex,
        se.weight,
        se.reps,
        se.rpe,
        se.rir
      FROM set_entry se
      INNER JOIN exercise_item ei ON ei.id = se.exercise_item_id
      WHERE se.session_id = ?
      ORDER BY ei.order_index ASC, se.set_index ASC
    `,
    [sessionId],
  );
  return rows;
}

export type ExerciseItemIntegrityIssue = {
  kind: "duplicate_id" | "duplicate_order_index";
  programDayId: string;
  values: string[];
};

export async function getExerciseItemIntegrityIssues(db: SQLiteDatabase, programDayId: string): Promise<ExerciseItemIntegrityIssue[]> {
  const rows = await db.getAllAsync<{ id: string; orderIndex: number; name: string }>(
    `
      SELECT id, order_index AS orderIndex, name
      FROM exercise_item
      WHERE program_day_id = ?
      ORDER BY order_index ASC
    `,
    [programDayId],
  );

  const idMap = new Map<string, string[]>();
  const orderMap = new Map<number, string[]>();
  for (const row of rows) {
    idMap.set(row.id, [...(idMap.get(row.id) ?? []), row.name]);
    orderMap.set(row.orderIndex, [...(orderMap.get(row.orderIndex) ?? []), `${row.id}:${row.name}`]);
  }

  const issues: ExerciseItemIntegrityIssue[] = [];
  for (const [id, names] of idMap.entries()) {
    if (names.length > 1) {
      issues.push({
        kind: "duplicate_id",
        programDayId,
        values: [id, ...names],
      });
    }
  }

  for (const [orderIndex, refs] of orderMap.entries()) {
    if (refs.length > 1) {
      issues.push({
        kind: "duplicate_order_index",
        programDayId,
        values: [`order_index=${orderIndex}`, ...refs],
      });
    }
  }

  return issues;
}
