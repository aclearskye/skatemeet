import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Fragment } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  accent: string;
  onAccent: string;
  onDirections: () => void;
  description: string | null;
  address: string | null;
};

// Below the hero (which carries the name, labels and photo upload):
// directions, description and address.
export function SpotInfoBlock({ accent, onAccent, onDirections, description, address }: Props) {
  return (
    <Fragment>
      <TouchableOpacity
        style={[styles.directionsBtn, { backgroundColor: accent }]}
        onPress={onDirections}
        activeOpacity={0.85}
      >
        <Ionicons name="navigate-outline" size={16} color={onAccent} />
        <Text style={[styles.directionsBtnText, { color: onAccent }]}>GET DIRECTIONS</Text>
      </TouchableOpacity>

      {description != null && description !== "" && (
        <Text style={styles.description}>{description}</Text>
      )}

      {address != null && address !== "" && (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={15} color={C.muted} />
          <Text style={styles.infoText}>{address}</Text>
        </View>
      )}
    </Fragment>
  );
}

const styles = StyleSheet.create({
  directionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
  },
  directionsBtnText: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1 },
  description: { fontFamily: F.body, fontSize: 15, color: C.text, lineHeight: 24 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoText: { fontFamily: F.monoRegular, fontSize: 12, color: C.muted, flex: 1 },
});
