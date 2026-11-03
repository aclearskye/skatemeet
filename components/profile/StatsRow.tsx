import { C, F } from "@/lib/theme";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  spots: number;
  clips: number;
  friends: number;
  onFriendsPress?: () => void;
};

type StatCellProps = {
  value: number;
  label: string;
  color: string;
  onPress?: () => void;
};

function StatCell({ value, label, color, onPress }: StatCellProps) {
  const content = (
    <>
      <Text style={[styles.value, { color }]}>{value ?? 0}</Text>
      <Text style={styles.label}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.cell} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.cell}>{content}</View>;
}

export default function StatsRow({ spots, clips, friends, onFriendsPress }: Props) {
  return (
    <View style={styles.row}>
      <StatCell value={spots} label="SPOTS" color={C.primary} />
      <View style={styles.divider} />
      <StatCell value={clips} label="CLIPS" color={C.tertiary} />
      <View style={styles.divider} />
      <StatCell value={friends} label="FRIENDS" color={C.secondary} onPress={onFriendsPress} />
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
    borderColor: C.borderVariant,
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
    backgroundColor: C.borderVariant,
  },
});
