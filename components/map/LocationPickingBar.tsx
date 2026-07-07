import { C, F } from "@/lib/theme";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  hasPendingPin: boolean;
  bottom: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function LocationPickingBar({ hasPendingPin, bottom, onCancel, onConfirm }: Props) {
  return (
    <View style={[styles.pickingBar, { bottom }]}>
      <Text style={styles.pickingText}>
        {hasPendingPin ? "LOCATION SET — CONFIRM OR REPIN" : "TAP MAP TO DROP PIN"}
      </Text>
      <View style={styles.pickingActions}>
        <TouchableOpacity style={styles.cancelPickBtn} onPress={onCancel}>
          <Text style={styles.cancelPickText}>CANCEL</Text>
        </TouchableOpacity>
        {hasPendingPin && (
          <TouchableOpacity style={styles.confirmPickBtn} onPress={onConfirm}>
            <Text style={styles.confirmPickText}>CONFIRM</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pickingBar: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: C.bgLow,
    borderWidth: 2,
    borderColor: C.primary,
    padding: 14,
    gap: 12,
  },
  pickingText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.primary,
    letterSpacing: 1,
    textAlign: "center",
  },
  pickingActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelPickBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelPickText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },
  confirmPickBtn: {
    flex: 2,
    backgroundColor: C.primary,
    paddingVertical: 10,
    alignItems: "center",
  },
  confirmPickText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.onPrimary,
    letterSpacing: 1,
  },
});
