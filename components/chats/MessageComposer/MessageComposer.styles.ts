import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: C.border,
    backgroundColor: C.bgLow,
  },
  inputWrap: {
    flex: 1,
    gap: 2,
  },
  input: {
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: C.borderVariant,
    backgroundColor: C.bg,
    color: C.text,
    fontFamily: F.body,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: C.primary,
  },
  counter: {
    alignSelf: "flex-end",
    fontFamily: F.monoRegular,
    fontSize: 10,
    color: C.muted,
  },
  counterOver: {
    color: C.error,
  },
  sendBtn: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: C.surfaceHigh,
  },
});
