import { StyleSheet } from "react-native";
import { C, F, R } from "@/lib/theme";

export const styles = StyleSheet.create({
  section: { gap: 14 },
  card: {
    padding: 16,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.borderVariant,
    backgroundColor: C.surfaceLow,
  },
  heading: { gap: 4 },
  title: { fontFamily: F.heading, fontSize: 16, letterSpacing: 1.5, color: C.text },
  hint: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: C.muted },
});
