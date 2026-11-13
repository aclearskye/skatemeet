import { StyleSheet } from "react-native";
import { C, F } from "@/lib/theme";

export const styles = StyleSheet.create({
  container: { gap: 18 },
  title: { fontFamily: F.heading, fontSize: 20, letterSpacing: 1.5, color: C.text },
  hint: { fontFamily: F.body, fontSize: 13, color: C.muted, marginTop: -10 },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
});
