import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { gap: 12 },
  hint: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
  saved: { fontFamily: F.body, fontSize: 13, color: C.primary },
});
