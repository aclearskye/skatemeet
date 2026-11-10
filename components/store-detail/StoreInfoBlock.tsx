import { StarRating } from "@/components/common/StarRating";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Fragment } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  osmRating: number | null;
  onDirections: () => void;
  address: string | null;
  hours: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
};

export function StoreInfoBlock({
  osmRating,
  onDirections,
  address,
  hours,
  phone,
  website,
  description,
}: Props) {
  return (
    <Fragment>
      {osmRating != null && <StarRating rating={osmRating} accent={C.secondary} />}

      <TouchableOpacity style={styles.directionsBtn} onPress={onDirections} activeOpacity={0.85}>
        <Ionicons name="navigate-outline" size={16} color={C.onSecondary} />
        <Text style={styles.directionsBtnText}>GET DIRECTIONS</Text>
      </TouchableOpacity>

      {description != null && description !== "" && (
        <Text style={styles.description}>{description}</Text>
      )}

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
  description: { fontFamily: F.body, fontSize: 15, color: C.text, lineHeight: 24 },
  infoSection: { gap: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderVariant },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoText: { fontFamily: F.body, fontSize: 14, color: C.text, flex: 1, lineHeight: 22 },
  infoLink: { color: C.secondary, textDecorationLine: "underline" },
});
