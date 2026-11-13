import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

// Same footprint as ChatListCard so the two interleave cleanly.
export const AVATAR_SIZE = 52;

export const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  // Square, not round: a spot rather than a person.
  tile: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, minWidth: 0, gap: 3 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: {
    flexShrink: 1,
    fontFamily: F.heading,
    fontSize: 16,
    color: C.text,
    letterSpacing: 0.3,
  },
  time: { marginLeft: "auto", fontFamily: F.monoRegular, fontSize: 11, color: C.muted },
  bottomRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 18 },
  preview: { flex: 1, fontFamily: F.body, fontSize: 13, color: C.muted },
  previewUnread: { fontFamily: F.bodyBold, color: C.text },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.tertiary },
  meta: { fontFamily: F.mono, fontSize: 9, letterSpacing: 1 },
});
