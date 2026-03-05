import { useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { getSessionDetail, getSessionSets } from "../../src/db/database";
import { SessionDetail, SessionSetDetail } from "../../src/types/program";

const STATUS_COLORS: Record<string, string> = {
  completed: "#16a34a",
  abandoned: "#dc2626",
  active: "#d97706",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  abandoned: "Abandoned",
  active: "In Progress",
};

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [sets, setSets] = useState<SessionSetDetail[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    getSessionDetail(sessionId).then(setSession);
    getSessionSets(sessionId).then(setSets);
  }, [sessionId]);

  if (!session) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const byExercise = new Map<string, { name: string; block: string; sets: SessionSetDetail[] }>();
  for (const set of sets) {
    const entry = byExercise.get(set.exerciseItemId) ?? { name: set.exerciseName, block: set.block, sets: [] };
    entry.sets.push(set);
    byExercise.set(set.exerciseItemId, entry);
  }

  const statusColor = STATUS_COLORS[session.status] ?? "#64748b";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{session.dayName}</Text>
      <Text style={styles.meta}>Week {session.weekNumber} · Day {session.dayNumber}</Text>
      <Text style={styles.meta}>{format(new Date(session.startedAt), "MMM d, yyyy h:mm a")}</Text>
      <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {STATUS_LABELS[session.status] ?? session.status}
        </Text>
      </View>

      {byExercise.size === 0 ? (
        <Text style={styles.empty}>No sets logged for this session.</Text>
      ) : (
        Array.from(byExercise.values()).map((ex) => (
          <View key={ex.name + ex.block} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{ex.name}</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.colHeader}>Set</Text>
              <Text style={styles.colHeader}>Weight</Text>
              <Text style={styles.colHeader}>Reps</Text>
              <Text style={styles.colHeader}>RPE</Text>
            </View>
            {ex.sets.map((set) => (
              <View key={set.setIndex} style={styles.tableRow}>
                <Text style={styles.cell}>{set.setIndex + 1}</Text>
                <Text style={styles.cell}>{set.weight ?? "-"}</Text>
                <Text style={styles.cell}>{set.reps ?? "-"}</Text>
                <Text style={styles.cell}>{set.rpe ?? "-"}</Text>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  meta: { color: "#475569" },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  empty: { color: "#64748b" },
  exerciseCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderColor: "#e2e8f0",
    borderWidth: 1,
  },
  exerciseName: { color: "#0f172a", fontWeight: "700", fontSize: 16 },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 6,
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
  },
  colHeader: {
    flex: 1,
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: { flexDirection: "row", paddingVertical: 4 },
  cell: { flex: 1, color: "#0f172a", fontWeight: "600" },
});
