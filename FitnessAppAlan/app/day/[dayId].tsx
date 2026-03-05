import { Redirect, useLocalSearchParams } from "expo-router";

export default function LegacyDayRoute() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  return <Redirect href={`/workout/${dayId ?? ""}`} />;
}
