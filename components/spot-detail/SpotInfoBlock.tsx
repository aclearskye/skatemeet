import { AddPhotoIconButton } from "@/components/common/AddPhotoIconButton";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Fragment } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  name: string;
  typeLabel: string;
  isUser: boolean;
  isVerified: boolean;
  isOsm: boolean;
  accent: string;
  onAccent: string;
  onDirections: () => void;
  onAddPhoto: () => void;
  isAddingPhoto: boolean;
  description: string | null;
  address: string | null;
};

export function SpotInfoBlock({
  name,
  typeLabel,
  isUser,
  isVerified,
  isOsm,
  accent,
  onAccent,
  onDirections,
  onAddPhoto,
  isAddingPhoto,
  description,
  address,
}: Props) {
  return (
    <Fragment>
      <View style={styles.nameRow}>
        <Text style={styles.name}>{name}</Text>
        <AddPhotoIconButton onPress={onAddPhoto} isLoading={isAddingPhoto} accent={accent} />
      </View>

      <View style={styles.badgeRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{typeLabel}</Text>
        </View>
        {isUser && isVerified && (
          <View style={[styles.verifiedBadge, { backgroundColor: accent }]}>
            <Text style={[styles.verifiedBadgeText, { color: onAccent }]}>VERIFIED</Text>
          </View>
        )}
        {isOsm && (
          <View style={styles.osmBadge}>
            <Text style={styles.osmBadgeText}>FROM OSM</Text>
          </View>
        )}
      </View>

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
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  name: { fontFamily: F.heading, fontSize: 28, color: C.text, letterSpacing: 0.5, flexShrink: 1 },
  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border,
  },
  typeBadgeText: { fontFamily: F.mono, fontSize: 10, color: C.textVariant, letterSpacing: 1 },
  verifiedBadge: { paddingHorizontal: 10, paddingVertical: 4 },
  verifiedBadgeText: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1 },
  osmBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  osmBadgeText: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 1 },
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
