import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  description: string | null;
  address: string | null;
};

// Below the hero and the action bar: description and address.
export function SpotInfoBlock({ description, address }: Props) {
  return (
    <Fragment>
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
  description: { fontFamily: F.body, fontSize: 15, color: C.text, lineHeight: 24 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoText: { fontFamily: F.monoRegular, fontSize: 12, color: C.muted, flex: 1 },
});
