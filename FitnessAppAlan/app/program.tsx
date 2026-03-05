import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { listProgramDays } from "../src/db/database";
import { ProgramDaySummary } from "../src/types/program";

export default function ProgramScreen() {
  const [days, setDays] = useState<ProgramDaySummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      listProgramDays().then(setDays);
    }, []),
  );

  const weeks = days.reduce<Map<number, ProgramDaySummary[]>>((map, day) => {
    const list = map.get(day.weekNumber) ?? [];
    list.push(day);
    map.set(day.weekNumber, list);
    return map;
  }, new Map());

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>12-Week Program</Text>
      {Array.from(weeks.entries()).map(([weekNum, weekDays]) => (
        <View key={weekNum} style={styles.weekSection}>
          <Text style={styles.weekHeader}>WEEK {weekNum}</Text>
          {weekDays.map((day) => (
            <Link key={day.id} href={`/workout/${day.id}`} asChild>
              <Pressable style={styles.dayCard}>
                <View>
                  <Text style={styles.dayName}>{day.name}</Text>
                  <Text style={styles.dayMeta}>Day {day.dayNumber}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      ))}
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
    gap: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  weekSection: {
    gap: 8,
  },
  weekHeader: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  dayCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderColor: "#e2e8f0",
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayName: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 16,
  },
  dayMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 2,
  },
  arrow: {
    color: "#94a3b8",
    fontSize: 22,
  },
});
