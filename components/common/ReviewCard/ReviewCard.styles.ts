import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderVariant,
    padding: 14,
    gap: 8,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  heading: {
    fontFamily: F.heading,
    fontSize: 16,
    color: C.text,
    letterSpacing: 0.3,
    flex: 1,
  },
  needsVotesBadge: {
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.borderVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  needsVotesText: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 1,
  },
  starsRow: { flexDirection: "row", gap: 3 },
  comment: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.textVariant,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  metaRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  author: {
    fontFamily: F.monoRegular,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.5,
  },
  date: { fontFamily: F.monoRegular, fontSize: 10, color: C.muted },
  iconBtn: { padding: 2 },
  upvoteBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  upvoteCount: { fontFamily: F.mono, fontSize: 11, color: C.muted },
});
