import { useRef, type ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/lib/theme";
import { styles } from "./SwipeableChatRow.styles";

type Props = {
  muted: boolean;
  onToggleMute: () => void;
  // Asks first (the row owns the confirm dialog); this just opens it.
  onDelete: () => void;
  children: ReactNode;
};

// A Chats tab card that swipes left to reveal MUTE / UNMUTE and DELETE.
// What delete means (leave a spot chat, hide a DM) is the caller's call.
export function SwipeableChatRow({ muted, onToggleMute, onDelete, children }: Props) {
  const swipeable = useRef<SwipeableMethods>(null);

  function run(action: () => void) {
    swipeable.current?.close();
    action();
  }

  return (
    <ReanimatedSwipeable
      ref={swipeable}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      // Opaque, so the card covers the actions behind it until it slides
      // clear of them (otherwise its text draws over the buttons).
      childrenContainerStyle={styles.card}
      renderRightActions={() => (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.action, styles.mute]}
            onPress={() => run(onToggleMute)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={muted ? "Unmute chat" : "Mute chat"}
          >
            <Ionicons name={muted ? "notifications" : "notifications-off"} size={20} color={C.onTape} />
            <Text style={[styles.actionText, styles.muteText]}>{muted ? "UNMUTE" : "MUTE"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.action, styles.delete]}
            onPress={() => run(onDelete)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Delete chat"
          >
            <Ionicons name="trash" size={20} color={C.onTapeRed} />
            <Text style={[styles.actionText, styles.deleteText]}>DELETE</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
