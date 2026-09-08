import { AddPhotoIconButton } from "@/components/common/AddPhotoIconButton";
import { StarRating } from "@/components/common/StarRating";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Fragment } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  name: string;
  isOsm: boolean;
  osmRating: number | null;
  onDirections: () => void;
  onAddPhoto: () => void;
  isAddingPhoto: boolean;
  address: string | null;
  hours: string | null;
  phone: string | null;
  website: string | null;
};

export function StoreInfoBlock({
  name,
  isOsm,
  osmRating,
  onDirections,
  onAddPhoto,
  isAddingPhoto,
  address,
  hours,
  phone,
  website,
}: Props) {
  return (
    <Fragment>
      <View style={styles.nameRow}>
        <Text style={styles.name}>{name}</Text>
        <AddPhotoIconButton onPress={onAddPhoto} isLoading={isAddingPhoto} accent={C.secondary} />
      </View>

      <View style={styles.badgeRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>SKATE STORE</Text>
        </View>
        {isOsm && (
          <View style={styles.osmBadge}>
            <Text style={styles.osmBadgeText}>FROM OSM</Text>
          </View>
        )}
      </View>

      {osmRating != null && <StarRating rating={osmRating} accent={C.secondary} />}

      <TouchableOpacity style={styles.directionsBtn} onPress={onDirections} activeOpacity={0.85}>
        <Ionicons name="navigate-outline" size={16} color={C.onSecondary} />
        <Text style={styles.directionsBtnText}>GET DIRECTIONS</Text>
      </TouchableOpacity>

      <View style={styles.infoSection}>
        {address !== "" && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={C.secondary} />
            <Text style={styles.infoText}>{address}</Text>
          </View>
        )}
        {hours != null && hours !== "" && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={C.secondary} />
            <Text style={styles.infoText}>{hours}</Text>
          </View>
        )}
        {phone != null && phone !== "" && (
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => Linking.openURL(`tel:${phone}`)}
            activeOpacity={0.75}
          >
            <Ionicons name="call-outline" size={16} color={C.secondary} />
            <Text style={[styles.infoText, styles.infoLink]}>{phone}</Text>
          </TouchableOpacity>
        )}
        {website != null && website !== "" && (
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() =>
              Linking.openURL(website.startsWith("http") ? website : `https://${website}`)
            }
            activeOpacity={0.75}
          >
            <Ionicons name="globe-outline" size={16} color={C.secondary} />
            <Text style={[styles.infoText, styles.infoLink]} numberOfLines={1}>
              {website}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
    backgroundColor: C.secondary,
    paddingVertical: 13,
  },
  directionsBtnText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.onSecondary,
    letterSpacing: 1,
  },
  infoSection: { gap: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoText: { fontFamily: F.body, fontSize: 14, color: C.text, flex: 1, lineHeight: 22 },
  infoLink: { color: C.secondary, textDecorationLine: "underline" },
});
