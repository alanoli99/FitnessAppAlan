import { Pressable, StyleSheet, Text, View } from "react-native";

type SessionHeaderProps = {
  dayName: string;
  weekNumber: number;
  dayNumber: number;
  loggedSets: number;
  plannedSets: number;
  estimatedMinutes: number;
  hasActiveSession: boolean;
  onStartOrContinue: () => void;
};

export function SessionHeader(props: SessionHeaderProps) {
  const {
    dayName,
    weekNumber,
    dayNumber,
    loggedSets,
    plannedSets,
    estimatedMinutes,
    hasActiveSession,
    onStartOrContinue,
  } = props;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{dayName}</Text>
      <Text style={styles.meta}>
        Week {weekNumber} · Day {dayNumber}
      </Text>
      <Text style={styles.progress}>
        {loggedSets} of {plannedSets} sets logged
      </Text>
      <Text style={styles.meta}>Estimated {estimatedMinutes} minutes</Text>
      <Pressable style={styles.button} onPress={onStartOrContinue}>
        <Text style={styles.buttonText}>{hasActiveSession ? "Continue Session" : "Start Session"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
  },
  meta: {
    color: "#475569",
  },
  progress: {
    color: "#0f172a",
    fontWeight: "700",
  },
  button: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
