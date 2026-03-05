import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getTodayWorkout } from "../src/db/database";
import { TodayWorkout } from "../src/types/program";

export default function HomeScreen() {
  const [today, setToday] = useState<TodayWorkout | null>(null);

  const load = useCallback(async () => {
    const workout = await getTodayWorkout();
    setToday(workout);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alan's Fitness</Text>
      <Text style={styles.subtitle}>12-week training tracker</Text>

      {today ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Workout</Text>
          <Text style={styles.dayName}>{today.name}</Text>
          <Text style={styles.meta}>
            Week {today.weekNumber} · Day {today.dayNumber}
          </Text>
          <Text style={styles.meta}>
            Program day {today.cycleDayIndex + 1} of {today.totalProgramDays}
          </Text>
          <Link href={`/workout/${today.id}`} asChild>
            <Pressable style={styles.button}>
              <Text style={styles.buttonText}>Open Workout</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <Text style={styles.fallback}>No workout data found.</Text>
      )}

      <View style={styles.row}>
        <Link href="/history" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>History</Text>
          </Pressable>
        </Link>
        <Link href="/program" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Program</Text>
          </Pressable>
        </Link>
        <Link href="/settings" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Settings</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
    backgroundColor: "#f5f7fb",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    color: "#475569",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 18,
    gap: 6,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 3,
  },
  cardTitle: {
    color: "#64748b",
    fontSize: 13,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  dayName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  meta: {
    color: "#475569",
  },
  button: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  fallback: {
    color: "#b91c1c",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "600",
  },
});
