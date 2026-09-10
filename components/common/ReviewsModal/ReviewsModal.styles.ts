import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  title: { fontFamily: F.heading, fontSize: 20, color: C.text, letterSpacing: 1 },
  count: { fontFamily: F.mono, fontSize: 14, color: C.muted, flex: 1 },
  closeBtn: { padding: 4 },
  body: { flex: 1 },
  bodyContent: { padding: 20 },
  emptyText: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.muted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 24,
  },
});
