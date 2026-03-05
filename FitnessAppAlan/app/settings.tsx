import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { getProgramStartDate, updateProgramStartDate } from "../src/db/database";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function SettingsScreen() {
  const [programStartDate, setProgramStartDate] = useState("");

  const load = useCallback(async () => {
    const date = await getProgramStartDate();
    setProgramStartDate(date);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleSave = async () => {
    if (!DATE_RE.test(programStartDate)) {
      Alert.alert("Invalid date", "Use YYYY-MM-DD format.");
      return;
    }
    await updateProgramStartDate(programStartDate);
    Alert.alert("Saved", "Program start date updated.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.label}>Program Start Date</Text>
      <TextInput
        style={styles.input}
        value={programStartDate}
        onChangeText={setProgramStartDate}
        placeholder="2026-03-05"
        autoCapitalize="none"
      />
      <Text style={styles.helper}>
        This controls which workout appears on Home each day.
      </Text>

      <Pressable style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Save</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    padding: 16,
    gap: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  label: {
    color: "#334155",
    fontWeight: "700",
  },
  input: {
    borderColor: "#cbd5e1",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  helper: {
    color: "#64748b",
  },
  button: {
    marginTop: 8,
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
