import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  title: { fontFamily: F.heading, fontSize: 20, color: C.text, letterSpacing: 1 },
  closeBtn: { padding: 4 },
  body: { flex: 1 },
  errorBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: C.errorContainer,
    borderWidth: 1,
    borderColor: C.errorBorder,
    padding: 12,
  },
  errorText: { fontFamily: F.body, fontSize: 13, color: C.error },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.borderVariant,
  },
  primaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1 },
});
