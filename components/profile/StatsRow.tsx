import { C, F } from "@/lib/theme";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  spots: number;
  clips: number;
  crew: number;
};

function StatCell({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.value, { color }]}>{value ?? 0}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export default function StatsRow({ spots, clips, crew }: Props) {
  return (
    <View style={styles.row}>
      <StatCell value={spots} label="SPOTS" color={C.primary} />
      <View style={styles.divider} />
      <StatCell value={clips} label="CLIPS" color={C.tertiary} />
      <View style={styles.divider} />
      <StatCell value={crew} label="CREW" color={C.secondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  value: {
    fontFamily: F.heading,
    fontSize: 24,
  },
  label: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: C.muted,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: C.border,
  },
});
