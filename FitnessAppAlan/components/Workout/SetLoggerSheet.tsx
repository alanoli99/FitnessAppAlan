import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getSetEntriesForExercise, logSet } from "../../src/db/database";
import { ProgramExercise, SetEntry } from "../../src/types/program";

type SetLoggerSheetProps = {
  visible: boolean;
  sessionId: string | null;
  exercise: ProgramExercise | null;
  onClose: () => void;
  onSetAdded: () => void;
};

function NumberAdjuster({
  label,
  value,
  onChange,
  steps,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  steps: number[];
}) {
  return (
    <View style={styles.adjuster}>
      <Text style={styles.adjusterLabel}>{label}</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" value={value} onChangeText={onChange} />
      <View style={styles.quickRow}>
        {steps.map((step) => (
          <Pressable
            key={`${label}-${step}`}
            style={styles.quickBtn}
            onPress={() => {
              const base = value.trim() === "" ? 0 : Number(value);
              const next = Number.isNaN(base) ? 0 : base + step;
              onChange(`${Math.max(0, Number(next.toFixed(2)))}`);
            }}
          >
            <Text style={styles.quickBtnText}>{step > 0 ? `+${step}` : `${step}`}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function formatRest(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SetLoggerSheet({ visible, sessionId, exercise, onClose, onSetAdded }: SetLoggerSheetProps) {
  const [sets, setSets] = useState<SetEntry[]>([]);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState("8");
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!sessionId || !exercise) {
      setSets([]);
      return;
    }
    const rows = await getSetEntriesForExercise(sessionId, exercise.exerciseItemId);
    setSets(rows);
  }, [sessionId, exercise?.exerciseItemId]);

  useEffect(() => {
    if (!visible) {
      setRestSecondsLeft(null);
      return;
    }
    load();
  }, [visible, load]);

  useEffect(() => {
    if (restSecondsLeft === null) return;
    if (restSecondsLeft <= 0) {
      setRestSecondsLeft(null);
      return;
    }
    const timer = setTimeout(() => setRestSecondsLeft((prev) => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [restSecondsLeft]);

  const sameAsLast = () => {
    const last = sets[sets.length - 1];
    if (!last) return;
    setWeight(last.weight == null ? "" : `${last.weight}`);
    setReps(last.reps == null ? "" : `${last.reps}`);
    setRpe(last.rpe == null ? "" : `${last.rpe}`);
  };

  const addSet = async () => {
    if (!sessionId || !exercise) return;
    const parsedWeight = weight.trim() === "" ? null : Number(weight);
    const parsedReps = reps.trim() === "" ? null : Number(reps);
    const parsedRpe = rpe.trim() === "" ? null : Number(rpe);
    await logSet({
      sessionId,
      exerciseItemId: exercise.exerciseItemId,
      weight: Number.isNaN(parsedWeight as number) ? null : parsedWeight,
      reps: Number.isNaN(parsedReps as number) ? null : parsedReps,
      rpe: Number.isNaN(parsedRpe as number) ? null : parsedRpe,
    });
    const restDuration = exercise.prescriptionJson.restSec ?? 90;
    setRestSecondsLeft(restDuration);
    setWeight("");
    setReps("");
    await load();
    onSetAdded();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{exercise?.name ?? "Logger"}</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          {exercise?.prescriptionJson.notes ? <Text style={styles.notes}>{exercise.prescriptionJson.notes}</Text> : null}

          <ScrollView style={styles.setTable} contentContainerStyle={styles.setTableContent}>
            {sets.map((entry, index) => (
              <View key={entry.id} style={styles.setRow}>
                <Text style={styles.setRowText}>Set {index + 1}</Text>
                <Text style={styles.setRowText}>Wt {entry.weight ?? "-"}</Text>
                <Text style={styles.setRowText}>Reps {entry.reps ?? "-"}</Text>
                <Text style={styles.setRowText}>RPE {entry.rpe ?? "-"}</Text>
              </View>
            ))}
            {sets.length === 0 ? <Text style={styles.empty}>No sets logged yet.</Text> : null}
          </ScrollView>

          {restSecondsLeft !== null && (
            <View style={styles.restTimer}>
              <Text style={styles.restLabel}>Rest</Text>
              <Text style={styles.restTime}>{formatRest(restSecondsLeft)}</Text>
              <Pressable onPress={() => setRestSecondsLeft(null)} style={styles.skipRest}>
                <Text style={styles.skipRestText}>Skip</Text>
              </Pressable>
            </View>
          )}

          <NumberAdjuster label="Weight" value={weight} onChange={setWeight} steps={[-5, -2.5, 2.5, 5]} />
          <NumberAdjuster label="Reps" value={reps} onChange={setReps} steps={[-1, 1]} />
          <NumberAdjuster label="RPE" value={rpe} onChange={setRpe} steps={[-0.5, 0.5]} />

          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={sameAsLast}>
              <Text style={styles.secondaryBtnText}>Same as last</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={addSet}>
              <Text style={styles.primaryBtnText}>Add set</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
    flex: 1,
  },
  close: {
    color: "#334155",
    fontWeight: "700",
  },
  notes: {
    color: "#475569",
  },
  setTable: {
    maxHeight: 180,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderColor: "#e2e8f0",
    borderWidth: 1,
  },
  setTableContent: {
    padding: 10,
    gap: 6,
  },
  setRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  setRowText: {
    color: "#0f172a",
    fontWeight: "600",
  },
  empty: {
    color: "#64748b",
  },
  restTimer: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  restLabel: {
    color: "#94a3b8",
    fontWeight: "700",
    fontSize: 13,
  },
  restTime: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 24,
    flex: 1,
    textAlign: "center",
  },
  skipRest: {
    backgroundColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipRestText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  adjuster: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderColor: "#e2e8f0",
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  adjusterLabel: {
    color: "#334155",
    fontWeight: "700",
  },
  input: {
    borderColor: "#cbd5e1",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#f8fafc",
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  quickBtn: {
    backgroundColor: "#eef2ff",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  quickBtnText: {
    color: "#3730a3",
    fontWeight: "700",
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#0f172a",
    fontWeight: "700",
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    paddingVertical: 10,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
