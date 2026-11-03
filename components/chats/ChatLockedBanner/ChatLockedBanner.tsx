import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/lib/theme";
import { styles } from "./ChatLockedBanner.styles";

export type ChatLockReason = "not_friends" | "blocked_by_me" | "unavailable";

type Props = {
  reason: ChatLockReason;
  bottomInset: number;
  onUnblock?: () => void;
};

export function ChatLockedBanner({ reason, bottomInset, onUnblock }: Props) {
  return (
    <View style={[styles.banner, { paddingBottom: bottomInset + 14 }]}>
      <Ionicons name="lock-closed" size={14} color={C.muted} />
      {reason === "not_friends" && <Text style={styles.text}>{"YOU'RE NO LONGER FRIENDS"}</Text>}
      {reason === "unavailable" && <Text style={styles.text}>{"THIS SKATER ISN'T AVAILABLE"}</Text>}
      {reason === "blocked_by_me" && (
        <>
          <Text style={styles.text}>YOU BLOCKED THIS SKATER ·</Text>
          <TouchableOpacity onPress={onUnblock} hitSlop={8} activeOpacity={0.7}>
            <Text style={styles.link}>UNBLOCK</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
