import { EntityRef } from "@/lib/checkins/types";
import { useCheckIn } from "@/lib/shared/hooks/useCheckIn";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./CheckInSection.styles";

type Props = {
  entityRef: EntityRef;
  accent: string;
  onAccent: string;
};

function liveCountLabel(count: number | null): string {
  if (count == null) return "";
  if (count === 0) return "NOBODY HERE YET";
  return count === 1 ? "1 SKATING NOW" : `${count} SKATING NOW`;
}

export function CheckInSection({ entityRef, accent, onAccent }: Props) {
  const { liveCount, isCheckedInHere, isLoadingStatus, errorMessage, isSubmitting, toggle } =
    useCheckIn(entityRef);

  return (
    <View style={styles.section}>
      <View style={styles.meta}>
        <Text style={styles.label}>LIVE STATUS</Text>
        <Text style={[styles.liveCount, { color: accent }]}>{liveCountLabel(liveCount)}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.btn,
          isCheckedInHere
            ? { backgroundColor: "transparent", borderColor: accent }
            : { backgroundColor: accent, borderColor: accent },
        ]}
        onPress={toggle}
        disabled={isLoadingStatus || isSubmitting}
        activeOpacity={0.8}
      >
        {isSubmitting ? (
          <ActivityIndicator color={isCheckedInHere ? accent : onAccent} size="small" />
        ) : (
          <>
            <Ionicons
              name={isCheckedInHere ? "checkmark-circle" : "location-outline"}
              size={16}
              color={isCheckedInHere ? accent : onAccent}
            />
            <Text style={[styles.btnText, { color: isCheckedInHere ? accent : onAccent }]}>
              {isCheckedInHere ? "CHECKED IN · TAP TO LEAVE" : "CHECK IN"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {errorMessage != null && <Text style={styles.error}>{errorMessage}</Text>}
    </View>
  );
}
