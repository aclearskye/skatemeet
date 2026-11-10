import { ActivityIndicator, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { styles } from "./SpotChatJoinPanel.styles";

type Props = {
  canJoin: boolean;
  isJoining: boolean;
  accent: string;
  onAccent: string;
  bottomInset: number;
  onJoin: () => void;
};

const RULES = [
  "Only your display name and photo are shown — never your @username.",
  "No phone numbers, emails, links or other apps. They're blocked automatically.",
  "Slurs, threats and sexual messages are removed, and can get you banned.",
  "Hold any message to report or block someone.",
];

export function SpotChatJoinPanel({ canJoin, isJoining, accent, onAccent, bottomInset, onJoin }: Props) {
  return (
    <View style={[styles.container, { paddingBottom: bottomInset + 20 }]}>
      <Text style={styles.heading}>JOIN THE SPOT CHAT</Text>
      <View style={styles.rules}>
        {RULES.map((rule) => (
          <View key={rule} style={styles.ruleRow}>
            <Ionicons name="checkmark" size={14} color={accent} />
            <Text style={styles.ruleText}>{rule}</Text>
          </View>
        ))}
      </View>

      {canJoin ? (
        <DuctTapeLabel
          color={accent}
          style={styles.joinBtn}
          maxTilt={0.5}
          onPress={onJoin}
          disabled={isJoining}
        >
          {isJoining ? (
            <ActivityIndicator size="small" color={onAccent} />
          ) : (
            <Text style={[styles.joinText, { color: onAccent }]}>JOIN CHAT</Text>
          )}
        </DuctTapeLabel>
      ) : (
        <Text style={styles.ineligible}>{"// YOUR ACCOUNT CAN'T JOIN SPOT CHATS"}</Text>
      )}
    </View>
  );
}
