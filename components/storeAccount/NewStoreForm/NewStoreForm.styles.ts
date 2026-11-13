import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { gap: 18 },
  addressSearch: { gap: 6 },
  spinner: { alignSelf: "flex-start", marginVertical: 6 },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  resultText: { flex: 1, fontFamily: F.body, fontSize: 14, color: C.text },
  pickedAddress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.primary,
  },
  pickedAddressText: { flex: 1, fontFamily: F.body, fontSize: 14, color: C.text },
  change: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: C.primary },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
});
