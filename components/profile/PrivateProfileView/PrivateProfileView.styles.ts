import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const AVATAR_SIZE = 96;

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 30,
  },
  breadcrumbTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
    letterSpacing: 1,
  },
  body: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 24,
    gap: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  displayName: {
    fontFamily: F.heading,
    fontSize: 22,
    color: C.text,
    letterSpacing: 1,
    flexShrink: 1,
  },
  username: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.muted,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: C.borderVariant,
  },
  lockText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },
  hint: {
    fontFamily: F.body,
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    lineHeight: 19,
  },
});
