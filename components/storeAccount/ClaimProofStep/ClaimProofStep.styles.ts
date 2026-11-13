import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { gap: 16 },
  title: { fontFamily: F.heading, fontSize: 20, letterSpacing: 1.5, color: C.text },
  body: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.textVariant },
  tip: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.tertiary },
  files: { gap: 8 },
  file: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.borderVariant,
    backgroundColor: C.surfaceLow,
  },
  fileName: { flex: 1, fontFamily: F.body, fontSize: 14, color: C.text },
  addFile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: R,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.primary,
  },
  addFileText: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1, color: C.primary },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
});
