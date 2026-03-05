import { SQLiteDatabase } from "expo-sqlite";

import { ExerciseSeed, Prescription, ProgramSeed } from "../types/program";

const PROGRAM_SEED = require("../data/program.json") as ProgramSeed;
const SEED_VERSION = "program_v2_2026_03_05";

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function inferBlock(exercise: ExerciseSeed): "warmup" | "main" | "accessory" | "cardio" {
  const name = exercise.name.toLowerCase();
  const prescription = exercise.prescription.toLowerCase();
  if (exercise.type === "cardio" || name.includes("cardio")) {
    return "cardio";
  }
  if (name.includes("warm") || prescription.includes("warm-up")) {
    return "warmup";
  }
  if (exercise.type === "note") {
    return "accessory";
  }
  return "main";
}

function firstRange(source: string, pattern: RegExp): [number, number] | undefined {
  const match = source.match(pattern);
  if (!match) {
    return undefined;
  }
  const first = Number(match[1]);
  const second = Number(match[2] ?? match[1]);
  return [first, second];
}

function parseSets(source: string): number | [number, number] | undefined {
  const range = firstRange(source, /(\d+)\s*-\s*(\d+)\s*sets?/i);
  if (range) {
    return range;
  }
  const single = source.match(/(\d+)\s*sets?/i);
  return single ? Number(single[1]) : undefined;
}

function parsePrescriptionText(raw: string): Prescription {
  const text = raw.trim();
  const workingReps = firstRange(text, /(\d+)\s*-\s*(\d+)\s*reps?/i) ?? firstRange(text, /(\d+)\s*reps?/i);
  const sets = parseSets(text);
  const intensity: Prescription["intensity"] | undefined = text.toLowerCase().includes("failure")
    ? { type: "failure" }
    : undefined;

  return {
    working: sets ? { sets, reps: workingReps } : undefined,
    intensity,
    notes: text || undefined,
  };
}

function estimatePlannedSetCount(prescription: Prescription): number {
  if (!prescription.working?.sets) {
    return 0;
  }
  if (Array.isArray(prescription.working.sets)) {
    return prescription.working.sets[1];
  }
  return prescription.working.sets;
}

function exerciseItemId(programDayId: string, orderIndex: number, name: string): string {
  return `${programDayId}::${`${orderIndex}`.padStart(2, "0")}::${slug(name)}`;
}

function cleanExercises(exercises: ExerciseSeed[]): ExerciseSeed[] {
  return exercises.filter((exercise) => {
    if (exercise.name.length < 2) {
      return false;
    }
    if (exercise.name.startsWith("_")) {
      return false;
    }
    return true;
  });
}

async function getMeta(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = ?", [key]);
  return row?.value ?? null;
}

async function setMeta(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

export async function seedProgramIfNeeded(db: SQLiteDatabase): Promise<void> {
  const currentVersion = await getMeta(db, "seed_version");
  const dayCount = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM program_days");
  if (currentVersion === SEED_VERSION && (dayCount?.count ?? 0) > 0) {
    return;
  }

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const week of PROGRAM_SEED.weeks) {
      for (const day of week.days) {
        const programDayId = `day-w${week.weekNumber}-d${day.dayNumber}`;
        await txn.runAsync(
          `
            INSERT INTO program_days (id, name, week, day, json)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              week = excluded.week,
              day = excluded.day,
              json = excluded.json
          `,
          [programDayId, day.name, week.weekNumber, day.dayNumber, JSON.stringify(day)],
        );

        const normalized = cleanExercises(day.exercises);
        const ids = new Set<string>();

        for (const [idx, exercise] of normalized.entries()) {
          const orderIndex = idx + 1;
          const id = exerciseItemId(programDayId, orderIndex, exercise.name);
          if (__DEV__) {
            if (ids.has(id)) {
              console.error("Duplicate exercise_item id", { id, programDayId, name: exercise.name });
            }
            ids.add(id);
          }

          const prescription = parsePrescriptionText(exercise.prescription);
          const enriched = {
            ...prescription,
            plannedSetCount: estimatePlannedSetCount(prescription),
            raw: exercise.prescription,
            type: exercise.type,
          };

          await txn.runAsync(
            `
              INSERT INTO exercise_item (id, program_day_id, block, order_index, name, prescription_json)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                program_day_id = excluded.program_day_id,
                block = excluded.block,
                order_index = excluded.order_index,
                name = excluded.name,
                prescription_json = excluded.prescription_json
            `,
            [id, programDayId, inferBlock(exercise), orderIndex, exercise.name, JSON.stringify(enriched)],
          );
        }
      }
    }
  });

  await setMeta(db, "seed_version", SEED_VERSION);
}
