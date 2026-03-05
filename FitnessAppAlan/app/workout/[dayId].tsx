import { FlashList } from "@shopify/flash-list";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { ExerciseRow } from "../../components/Workout/ExerciseRow";
import { SessionHeader } from "../../components/Workout/SessionHeader";
import { SetLoggerSheet } from "../../components/Workout/SetLoggerSheet";
import { completeSession, ensureOpenSessionForDay, getActiveSessionForDay, getExerciseItemIntegrityIssues, getProgramDayDetails, getProgressByExerciseId } from "../../src/db/database";
import { toProgressMap } from "../../src/services/progress";
import { ExerciseProgress, ProgramDayDetails, ProgramExercise } from "../../src/types/program";

type ListItem =
  | { type: "header"; id: string; title: string }
  | { type: "exercise"; id: string; exercise: ProgramExercise };

const BLOCK_ORDER: Array<ProgramExercise["block"]> = ["warmup", "main", "accessory", "cardio"];

export default function WorkoutScreen() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const router = useRouter();
  const selectedDayId = dayId ?? "";

  const [details, setDetails] = useState<ProgramDayDetails | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progressRows, setProgressRows] = useState<ExerciseProgress[]>([]);
  const [loggerVisible, setLoggerVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ProgramExercise | null>(null);

  const progressById = useMemo(() => toProgressMap(progressRows), [progressRows]);

  const refresh = useCallback(async () => {
    if (!selectedDayId) {
      return;
    }
    const day = await getProgramDayDetails(selectedDayId);
    setDetails(day);
    const active = await getActiveSessionForDay(selectedDayId);
    setSessionId(active?.id ?? null);
    if (active?.id) {
      const rows = await getProgressByExerciseId(active.id);
      setProgressRows(rows);
    } else {
      setProgressRows([]);
    }

    if (__DEV__) {
      const issues = await getExerciseItemIntegrityIssues(selectedDayId);
      if (issues.length > 0) {
        for (const issue of issues) {
          console.error("[exercise_item integrity]", issue.kind, issue.programDayId, issue.values);
        }
      }
    }
  }, [selectedDayId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startOrContinue = useCallback(async () => {
    if (!selectedDayId) {
      return;
    }
    const id = await ensureOpenSessionForDay(selectedDayId);
    setSessionId(id);
    const rows = await getProgressByExerciseId(id);
    setProgressRows(rows);
  }, [selectedDayId]);

  const onExercisePress = useCallback(
    (exercise: ProgramExercise) => {
      if (!sessionId) {
        Alert.alert("Start session first", "Tap Start Session in the header.");
        return;
      }
      setSelectedExercise(exercise);
      setLoggerVisible(true);
    },
    [sessionId],
  );

  const onSetAdded = useCallback(async () => {
    if (!sessionId) {
      return;
    }
    const rows = await getProgressByExerciseId(sessionId);
    setProgressRows(rows);
  }, [sessionId]);

  const finishSession = useCallback(async () => {
    if (!sessionId) {
      return;
    }
    const totalLogged = Object.values(progressById).reduce((sum, value) => sum + value, 0);
    if (totalLogged === 0) {
      Alert.alert("No sets logged", "Finish session anyway?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish",
          style: "destructive",
          onPress: async () => {
            await completeSession(sessionId);
            setSessionId(null);
            setProgressRows([]);
            router.push("/history");
          },
        },
      ]);
      return;
    }

    await completeSession(sessionId);
    setSessionId(null);
    setProgressRows([]);
    router.push("/history");
  }, [sessionId, progressById, router]);

  const listItems = useMemo<ListItem[]>(() => {
    if (!details) {
      return [];
    }
    const grouped = new Map<ProgramExercise["block"], ProgramExercise[]>();
    for (const block of BLOCK_ORDER) {
      grouped.set(block, []);
    }
    for (const exercise of details.exercises) {
      grouped.get(exercise.block)?.push(exercise);
    }

    const items: ListItem[] = [];
    for (const block of BLOCK_ORDER) {
      const group = grouped.get(block) ?? [];
      if (group.length === 0) {
        continue;
      }
      items.push({ type: "header", id: `header-${block}`, title: block.toUpperCase() });
      for (const exercise of group) {
        items.push({ type: "exercise", id: exercise.exerciseItemId, exercise });
      }
    }
    return items;
  }, [details]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const item of listItems) {
      if (item.type !== "exercise") {
        continue;
      }
      if (seen.has(item.id)) {
        duplicates.push(item.id);
      } else {
        seen.add(item.id);
      }
    }
    if (duplicates.length > 0) {
      console.error("[workout render duplicate exercise ids]", { dayId: selectedDayId, duplicates });
    }
  }, [listItems, selectedDayId]);

  const totals = useMemo(() => {
    if (!details) {
      return { plannedSets: 0, loggedSets: 0, estimatedMinutes: 0 };
    }
    const plannedSets = details.exercises.reduce((sum, ex) => sum + ex.plannedSetCount, 0);
    const loggedSets = Object.values(progressById).reduce((sum, value) => sum + value, 0);
    const estimatedMinutes = Math.max(20, Math.round(details.exercises.length * 4 + plannedSets * 1.2));
    return { plannedSets, loggedSets, estimatedMinutes };
  }, [details, progressById]);

  if (!details) {
    return (
      <View style={styles.center}>
        <Text>Loading workout...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={listItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.type === "header") {
            return <Text style={styles.sectionHeader}>{item.title}</Text>;
          }
          const count = progressById[item.exercise.exerciseItemId] ?? 0;
          return <ExerciseRow exercise={item.exercise} loggedSetCount={count} onPress={onExercisePress} />;
        }}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <SessionHeader
            dayName={details.name}
            weekNumber={details.weekNumber}
            dayNumber={details.dayNumber}
            loggedSets={totals.loggedSets}
            plannedSets={totals.plannedSets}
            estimatedMinutes={totals.estimatedMinutes}
            hasActiveSession={Boolean(sessionId)}
            onStartOrContinue={startOrContinue}
          />
        }
      />

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomText}>
            {totals.loggedSets} / {totals.plannedSets || "?"} sets
          </Text>
          <Text style={styles.bottomSub}>Session progress</Text>
        </View>
        <Pressable style={styles.finishButton} onPress={finishSession} disabled={!sessionId}>
          <Text style={styles.finishButtonText}>Finish Session</Text>
        </Pressable>
      </View>

      <SetLoggerSheet
        visible={loggerVisible}
        sessionId={sessionId}
        exercise={selectedExercise}
        onClose={() => setLoggerVisible(false)}
        onSetAdded={onSetAdded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 14,
    paddingBottom: 100,
    gap: 10,
  },
  sectionHeader: {
    marginTop: 6,
    marginBottom: 2,
    color: "#334155",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.8,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#0f172a",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  bottomSub: {
    color: "#cbd5e1",
    fontSize: 12,
  },
  finishButton: {
    backgroundColor: "#22c55e",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  finishButtonText: {
    color: "#052e16",
    fontWeight: "800",
  },
});
