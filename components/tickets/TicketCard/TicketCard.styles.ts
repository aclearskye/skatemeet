import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  card: {
    gap: 6,
    padding: 16,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceLow,
  },
  inactive: { opacity: 0.6 },
  store: { fontFamily: F.mono, fontSize: 10, letterSpacing: 2, color: C.muted },
  name: { fontFamily: F.bodyBold, fontSize: 17, color: C.text },
  detail: { fontFamily: F.body, fontSize: 13, color: C.textVariant },
  price: { fontFamily: F.mono, fontSize: 12, color: C.primary },
  // Scanners need dark modules on a light background, whatever the theme.
  qr: {
    alignSelf: "center",
    marginTop: 12,
    padding: 12,
    borderRadius: R,
    backgroundColor: C.text,
  },
  hint: { fontFamily: F.body, fontSize: 13, color: C.muted, textAlign: "center", marginTop: 4 },
  status: { fontFamily: F.mono, fontSize: 12, letterSpacing: 2, color: C.muted, marginTop: 8 },
});
