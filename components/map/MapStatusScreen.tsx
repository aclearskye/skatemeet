import { C, F } from "@/lib/theme";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type Props = { kind: "loading" | "denied" };

export function MapStatusScreen({ kind }: Props) {
  if (kind === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.statusText}>GETTING YOUR LOCATION…</Text>
      </View>
    );
  }
  return (
    <View style={styles.center}>
      <Text style={styles.errorHeading}>LOCATION NEEDED</Text>
      <Text style={styles.errorBody}>
        Enable location access in your device settings to find skate spots near you.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: C.bg,
  },
  statusText: {
    marginTop: 16,
    color: C.muted,
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 2,
  },
  errorHeading: {
    fontFamily: F.heading,
    fontSize: 24,
    color: C.text,
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: "center",
  },
  errorBody: {
    color: C.muted,
    fontFamily: F.body,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
