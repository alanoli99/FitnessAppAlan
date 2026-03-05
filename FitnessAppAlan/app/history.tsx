import { Link, useFocusEffect } from "expo-router";
import { format } from "date-fns";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { listRecentSessions } from "../src/db/database";
import { SessionSummary } from "../src/types/program";

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

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  const load = useCallback(async () => {
    const data = await listRecentSessions(40);
    setSessions(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>Recent sessions and total sets</Text>
      {sessions.length === 0 ? (
        <Text style={styles.empty}>No sessions yet.</Text>
      ) : (
        sessions.map((session) => (
          <Link key={session.id} href={`/session/${session.id}`} asChild>
            <Pressable style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.dayName}>{session.dayName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[session.status] ?? "#64748b") + "22" }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[session.status] ?? "#64748b" }]}>
                    {STATUS_LABELS[session.status] ?? session.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.meta}>{format(new Date(session.performedAt), "MMM d, yyyy h:mm a")}</Text>
              <Text style={styles.sets}>Total sets: {session.totalSets}</Text>
            </Pressable>
          </Link>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    color: "#64748b",
  },
  empty: {
    color: "#b91c1c",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderColor: "#e2e8f0",
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayName: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 17,
    flex: 1,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  meta: {
    color: "#475569",
  },
  sets: {
    color: "#0f172a",
    fontWeight: "600",
  },
});
