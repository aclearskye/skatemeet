import { C, F, R } from "@/lib/theme";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  gettingLocation: boolean;
  tooZoomedOut: boolean;
  markersLoading: boolean;
  scanningMinimum: boolean;
  nothingVisible: boolean;
  dismissedEmpty: boolean;
  onDismiss: () => void;
  top: number;
};

export function MapStatusBanner({
  gettingLocation,
  tooZoomedOut,
  markersLoading,
  scanningMinimum,
  nothingVisible,
  dismissedEmpty,
  onDismiss,
  top,
}: Props) {
  const isScanning = markersLoading || scanningMinimum;
  const visible = gettingLocation || tooZoomedOut || isScanning || (nothingVisible && !dismissedEmpty);
  if (!visible) return null;

  const dismissible = !gettingLocation && !tooZoomedOut && !isScanning;

  return (
    <View style={[styles.emptyBanner, { top }]}>
      <Text style={styles.emptyText}>
        {gettingLocation
          ? "// GETTING YOUR LOCATION…"
          : tooZoomedOut
          ? "// ZOOM IN TO SEE SPOTS"
          : isScanning
          ? "// SCANNING NEARBY…"
          : "// NOTHING FOUND NEARBY."}
      </Text>
      {dismissible ? (
        <TouchableOpacity onPress={onDismiss} style={styles.emptyDismiss}>
          <Text style={styles.emptyDismissText}>✕</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyDismiss} pointerEvents="none">
          <Text style={[styles.emptyDismissText, { opacity: 0 }]}>✕</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: C.surfaceHigh,
    borderRadius: R,
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emptyText: {
    color: C.muted,
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
  },
  emptyDismiss: {
    padding: 4,
  },
  emptyDismissText: {
    color: C.muted,
    fontFamily: F.mono,
    fontSize: 12,
  },
});
