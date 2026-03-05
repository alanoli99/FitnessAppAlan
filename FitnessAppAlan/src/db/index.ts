import { SQLiteDatabase, openDatabaseAsync } from "expo-sqlite";

import { migrate } from "./migrations";
import * as q from "./queries";
import { seedProgramIfNeeded } from "../services/seed";
import { ExerciseProgress, ProgramDayDetails, ProgramDaySummary, SessionDetail, SessionRecord, SessionSetDetail, SessionSummary, SetEntry, TodayWorkout } from "../types/program";

const DB_NAME = "fitness.db";

let dbPromise: Promise<SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export async function initializeDatabase(): Promise<void> {
  const db = await getDb();
  await migrate(db);
  await seedProgramIfNeeded(db);
}

export async function listProgramDays(): Promise<ProgramDaySummary[]> {
  const db = await getDb();
  return q.listProgramDays(db);
}

export async function getProgramStartDate(): Promise<string> {
  const db = await getDb();
  return q.getProgramStartDate(db);
}

export async function updateProgramStartDate(value: string): Promise<void> {
  const db = await getDb();
  await q.updateProgramStartDate(db, value);
}

export async function getTodayWorkout(now: Date = new Date()): Promise<TodayWorkout | null> {
  const db = await getDb();
  return q.getTodayWorkout(db, now);
}

export async function getProgramDayDetails(dayId: string): Promise<ProgramDayDetails | null> {
  const db = await getDb();
  return q.getProgramDayDetails(db, dayId);
}

export async function ensureOpenSessionForDay(dayId: string): Promise<string> {
  const db = await getDb();
  return q.ensureOpenSessionForDay(db, dayId);
}

export async function getActiveSessionForDay(dayId: string): Promise<SessionRecord | null> {
  const db = await getDb();
  return q.getActiveSessionForDay(db, dayId);
}

export async function completeSession(sessionId: string): Promise<void> {
  const db = await getDb();
  await q.completeSession(db, sessionId);
}

export async function logSet(input: {
  sessionId: string;
  exerciseItemId: string;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  rir?: number | null;
}): Promise<void> {
  const db = await getDb();
  await q.addSetEntry(db, input);
}

export async function getExerciseSetCount(sessionId: string, exerciseItemId: string): Promise<number> {
  const db = await getDb();
  return q.getExerciseSetCount(db, sessionId, exerciseItemId);
}

export async function getProgressByExerciseId(sessionId: string): Promise<ExerciseProgress[]> {
  const db = await getDb();
  return q.getProgressByExerciseId(db, sessionId);
}

export async function getSetEntriesForExercise(sessionId: string, exerciseItemId: string): Promise<SetEntry[]> {
  const db = await getDb();
  return q.getSetEntriesForExercise(db, sessionId, exerciseItemId);
}

export async function listRecentSessions(limit = 30): Promise<SessionSummary[]> {
  const db = await getDb();
  return q.listRecentSessions(db, limit);
}

export async function getExerciseItemIntegrityIssues(programDayId: string) {
  const db = await getDb();
  return q.getExerciseItemIntegrityIssues(db, programDayId);
}

export async function getSessionDetail(sessionId: string): Promise<SessionDetail | null> {
  const db = await getDb();
  return q.getSessionDetail(db, sessionId);
}

export async function getSessionSets(sessionId: string): Promise<SessionSetDetail[]> {
  const db = await getDb();
  return q.getSessionSets(db, sessionId);
}

export { q as dbQueries };
