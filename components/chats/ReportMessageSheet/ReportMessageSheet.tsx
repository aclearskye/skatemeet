import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MESSAGE_REPORT_REASONS, type MessageReportReason } from "@/lib/messages/types";
import { C } from "@/lib/theme";
import { Switch } from "@/components/common/Switch";
import { styles } from "./ReportMessageSheet.styles";

export type ReportMessageSubmit = {
  reason: MessageReportReason;
  details: string | null;
  block: boolean;
};

type Props = {
  visible: boolean;
  username: string | null;
  onClose: () => void;
  onSubmit: (input: ReportMessageSubmit) => Promise<void>;
};

export function ReportMessageSheet({ visible, username, onClose, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<MessageReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setReason(null);
      setDetails("");
      setBlock(true);
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [visible]);

  async function handleSubmit() {
    if (!reason) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit({ reason, details: details.trim() || null, block: block && username != null });
      onClose();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Couldn't send the report. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>REPORT MESSAGE</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color={C.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>{"WHAT'S WRONG?"}</Text>
            {MESSAGE_REPORT_REASONS.map((option) => (
              <TouchableOpacity
                key={option.code}
                style={styles.reasonRow}
                onPress={() => setReason(option.code)}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === option.code }}
              >
                <Ionicons
                  name={reason === option.code ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={reason === option.code ? C.primary : C.muted}
                />
                <Text style={styles.reasonText}>{option.label}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.fieldLabel}>ANYTHING ELSE? (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="Add details for our moderators"
              placeholderTextColor={C.muted}
              value={details}
              onChangeText={setDetails}
              maxLength={500}
              multiline
              textAlignVertical="top"
            />

            {username && (
              <View style={styles.blockRow}>
                <View style={styles.blockText}>
                  <Text style={styles.blockTitle}>Also block @{username}</Text>
                  <Text style={styles.blockDescription}>
                    Ends the friendship and stops messages and requests both ways.
                  </Text>
                </View>
                <Switch value={block} onValueChange={setBlock} />
              </View>
            )}

            <Text style={styles.privacyNote}>
              {"Moderators will see this message and up to five messages before it. They won't see who reported it, and the copy is deleted 90 days after the report is resolved."}
            </Text>

            {errorMsg && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, (!reason || isSubmitting) && styles.primaryBtnDisabled]}
            disabled={!reason || isSubmitting}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={C.onError} />
            ) : (
              <Text style={styles.primaryBtnText}>SEND REPORT</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
