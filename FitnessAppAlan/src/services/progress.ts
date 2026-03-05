import { ExerciseProgress } from "../types/program";

export function toProgressMap(progressRows: ExerciseProgress[]): Record<string, number> {
  return progressRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.exerciseItemId] = row.setCount;
    return acc;
  }, {});
}

export function sumSetTargets(values: number[]): number {
  return values.reduce((total, count) => total + count, 0);
}
