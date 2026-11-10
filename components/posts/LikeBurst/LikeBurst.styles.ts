import { StyleSheet } from "react-native";
import { C } from "@/lib/theme";

export const styles = StyleSheet.create({
  burst: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -48,
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.secondary,
    borderWidth: 2,
    borderColor: C.border,
    shadowColor: C.bgLowest,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 6,
  },
});
