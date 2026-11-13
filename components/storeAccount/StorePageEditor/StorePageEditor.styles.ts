import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  headerText: { flex: 1, gap: 2 },
  heading: { fontFamily: F.heading, fontSize: 20, letterSpacing: 2, color: C.text },
  subheading: { fontFamily: F.monoRegular, fontSize: 13, letterSpacing: 0.5, color: C.muted },
  content: { padding: 16, gap: 18 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 16 },
  summary: { gap: 4 },
  summaryName: { fontFamily: F.heading, fontSize: 24, letterSpacing: 1.5, color: C.text },
  muted: { fontFamily: F.monoRegular, fontSize: 12, color: C.muted },
  hint: { fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: -8 },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
  saved: { fontFamily: F.body, fontSize: 13, color: C.primary },
});
