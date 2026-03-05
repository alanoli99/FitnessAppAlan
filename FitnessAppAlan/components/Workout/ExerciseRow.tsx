import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ProgramExercise } from "../../src/types/program";

type ExerciseRowProps = {
  exercise: ProgramExercise;
  loggedSetCount: number;
  onPress: (exercise: ProgramExercise) => void;
};

function buildChips(exercise: ProgramExercise): string[] {
  const chips: string[] = [];
  const warmup = exercise.prescriptionJson.warmup;
  if (warmup?.sets) {
    const setsText = Array.isArray(warmup.sets) ? `${warmup.sets[0]}-${warmup.sets[1]}` : `${warmup.sets}`;
    const repsText = warmup.reps ? `${warmup.reps[0]}-${warmup.reps[1]}` : "?";
    chips.push(`Warmup ${setsText} x ${repsText}`);
  }
  const working = exercise.prescriptionJson.working;
  if (working?.sets) {
    const setsText = Array.isArray(working.sets) ? `${working.sets[0]}-${working.sets[1]}` : `${working.sets}`;
    const repsText = working.reps ? `${working.reps[0]}-${working.reps[1]}` : "?";
    const prefix = exercise.block === "warmup" ? "Warmup" : "Working";
    chips.push(`${prefix} ${setsText} x ${repsText}`);
  }
  if (exercise.prescriptionJson.intensity?.type === "failure") {
    chips.push("To failure");
  }
  if (exercise.prescriptionJson.restSec) {
    chips.push(`Rest ${exercise.prescriptionJson.restSec}s`);
  }
  return chips.slice(0, 4);
}

function ExerciseRowBase({ exercise, loggedSetCount, onPress }: ExerciseRowProps) {
  const planned = exercise.plannedSetCount || 0;
  const chips = buildChips(exercise);
  const isComplete = planned > 0 && loggedSetCount >= planned;

  return (
    <Pressable style={[styles.card, isComplete && styles.cardComplete]} onPress={() => onPress(exercise)}>
      <View style={styles.nameRow}>
        <Text style={styles.name}>{exercise.name}</Text>
        {isComplete && <Text style={styles.checkmark}>✓</Text>}
      </View>
      {chips.length > 0 ? (
        <View style={styles.chipWrap}>
          {chips.map((chip) => (
            <View key={`${exercise.exerciseItemId}-${chip}`} style={styles.chip}>
              <Text style={styles.chipText}>{chip}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.notes} numberOfLines={2}>
          {exercise.prescriptionJson.notes ?? "No prescription details"}
        </Text>
      )}
      <Text style={[styles.progress, isComplete && styles.progressComplete]}>
        {loggedSetCount} / {planned || "?"} sets logged
      </Text>
    </Pressable>
  );
}

export const ExerciseRow = memo(ExerciseRowBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  cardComplete: {
    borderColor: "#16a34a",
    borderWidth: 1.5,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
  },
  checkmark: {
    color: "#16a34a",
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 8,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: "#eef2ff",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    color: "#3730a3",
    fontSize: 12,
    fontWeight: "600",
  },
  notes: {
    color: "#475569",
  },
  progress: {
    color: "#334155",
    fontWeight: "600",
  },
  progressComplete: {
    color: "#16a34a",
  },
});
