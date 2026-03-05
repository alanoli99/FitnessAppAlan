export type ExerciseSeed = {
  name: string;
  type: "strength" | "cardio" | "note";
  prescription: string;
};

export type ProgramDaySeed = {
  dayNumber: number;
  programDayNumber: number;
  name: string;
  focus: string;
  sourceFile: string;
  exercises: ExerciseSeed[];
};

export type ProgramWeekSeed = {
  weekNumber: number;
  title: string;
  days: ProgramDaySeed[];
};

export type ProgramSeed = {
  programName: string;
  source: string;
  weeks: ProgramWeekSeed[];
};

export type Prescription = {
  warmup?: {
    sets: number | [number, number];
    reps?: [number, number];
  };
  working?: {
    sets: number | [number, number];
    reps?: [number, number];
  };
  intensity?: {
    type: "failure" | "rpe" | "rir";
    value?: number;
  };
  restSec?: number;
  notes?: string;
};

export type ProgramDaySummary = {
  id: string;
  weekNumber: number;
  dayNumber: number;
  name: string;
  json?: string | null;
};

export type ProgramExercise = {
  exerciseItemId: string;
  programDayId: string;
  block: "warmup" | "main" | "accessory" | "cardio";
  orderIndex: number;
  name: string;
  prescriptionJson: Prescription;
  plannedSetCount: number;
};

export type ProgramDayDetails = ProgramDaySummary & {
  exercises: ProgramExercise[];
};

export type TodayWorkout = ProgramDaySummary & {
  cycleDayIndex: number;
  totalProgramDays: number;
};

export type SessionStatus = "active" | "completed" | "abandoned";

export type SessionSummary = {
  id: string;
  dayName: string;
  performedAt: number;
  totalSets: number;
  status: SessionStatus;
};

export type SessionRecord = {
  id: string;
  programDayId: string;
  startedAt: number;
  endedAt: number | null;
  status: SessionStatus;
  notes: string | null;
};

export type SessionDetail = {
  id: string;
  dayName: string;
  weekNumber: number;
  dayNumber: number;
  startedAt: number;
  endedAt: number | null;
  status: SessionStatus;
  notes: string | null;
};

export type SessionSetDetail = {
  exerciseItemId: string;
  exerciseName: string;
  block: "warmup" | "main" | "accessory" | "cardio";
  orderIndex: number;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  rir: number | null;
};

export type SetEntry = {
  id: string;
  sessionId: string;
  exerciseItemId: string;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  rir: number | null;
  createdAt: number;
};

export type ExerciseProgress = {
  exerciseItemId: string;
  setCount: number;
};
