import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  section: { gap: 0 },
  card: {
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.borderVariant,
    backgroundColor: C.surfaceLow,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  // A group's header is its own bar; its children are cards below it.
  groupHeader: {
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.borderVariant,
    backgroundColor: C.surfaceLow,
  },
  headerText: { flex: 1, gap: 3 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: F.heading, fontSize: 16, letterSpacing: 1.5, color: C.text },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.error },
  summary: { fontFamily: F.body, fontSize: 13, color: C.muted },
  body: { gap: 14, paddingHorizontal: 16, paddingBottom: 16 },
  groupBody: { paddingHorizontal: 0, paddingTop: 10, paddingBottom: 0 },
  hidden: { display: "none" },
  hint: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: C.muted },
});
