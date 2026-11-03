import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MESSAGE_MAX_LENGTH } from "@/lib/messages/types";
import { C } from "@/lib/theme";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { styles } from "./MessageComposer.styles";

// The counter only appears near the limit, so it doesn't clutter every chat.
const COUNTER_THRESHOLD = MESSAGE_MAX_LENGTH - 200;

type Props = {
  onSend: (body: string) => void;
  bottomInset: number;
};

export function MessageComposer({ onSend, bottomInset }: Props) {
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && trimmed.length <= MESSAGE_MAX_LENGTH;

  function handleSend() {
    if (!canSend) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomInset + 10 }]}>
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, isFocused && styles.inputFocused]}
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor={C.muted}
          multiline
          maxLength={MESSAGE_MAX_LENGTH}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel="Message"
        />
        {text.length >= COUNTER_THRESHOLD && (
          <Text style={[styles.counter, text.length >= MESSAGE_MAX_LENGTH && styles.counterOver]}>
            {text.length}/{MESSAGE_MAX_LENGTH}
          </Text>
        )}
      </View>
      {canSend ? (
        <DuctTapeLabel color={C.primary} style={styles.sendBtn} onPress={handleSend}>
          <Ionicons name="send" size={18} color={C.onPrimary} accessibilityLabel="Send" />
        </DuctTapeLabel>
      ) : (
        <TouchableOpacity style={[styles.sendBtn, styles.sendBtnDisabled]} disabled activeOpacity={1}>
          <Ionicons name="send" size={18} color={C.muted} accessibilityLabel="Send" />
        </TouchableOpacity>
      )}
    </View>
  );
}
