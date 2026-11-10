import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAvoidingView, KeyboardAwareScrollView } from "@/lib/shared/keyboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MESSAGE_REPORT_REASONS, type MessageReportReason } from "@/lib/messages/types";
import type { ReportReason } from "@/lib/shared/types";
import { C } from "@/lib/theme";
import { Switch } from "@/components/common/Switch";
import { styles } from "./ReportMessageSheet.styles";

export type ReportMessageSubmit<TReason extends string = MessageReportReason> = {
  reason: TReason;
  details: string | null;
  block: boolean;
};

// The "also block" toggle's wording; null hides the toggle.
export type ReportBlockOption = { title: string; description: string };

type Props<TReason extends string> = {
  visible: boolean;
  blockOption: ReportBlockOption | null;
  // Defaults to the DM reasons.
  reasons?: readonly (ReportReason & { code: TReason })[];
  onClose: () => void;
  onSubmit: (input: ReportMessageSubmit<TReason>) => Promise<void>;
};

export function ReportMessageSheet<TReason extends string = MessageReportReason>({
  visible,
  blockOption,
  reasons,
  onClose,
  onSubmit,
}: Props<TReason>) {
  const insets = useSafeAreaInsets();
  const reasonOptions = reasons ?? (MESSAGE_REPORT_REASONS as unknown as readonly (ReportReason & { code: TReason })[]);
  const [reason, setReason] = useState<TReason | null>(null);
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
      await onSubmit({ reason, details: details.trim() || null, block: block && blockOption != null });
      onClose();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Couldn't send the report. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {/* Pads above the keyboard (both platforms) so the footer buttons stay
          visible; the body keeps the focused field clear of them. */}
      <KeyboardAvoidingView style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>REPORT MESSAGE</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color={C.muted} />
          </TouchableOpacity>
        </View>

        <KeyboardAwareScrollView style={styles.body} bottomOffset={100}>
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>{"WHAT'S WRONG?"}</Text>
            {reasonOptions.map((option) => (
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

            {blockOption && (
              <View style={styles.blockRow}>
                <View style={styles.blockText}>
                  <Text style={styles.blockTitle}>{blockOption.title}</Text>
                  <Text style={styles.blockDescription}>{blockOption.description}</Text>
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
        </KeyboardAwareScrollView>

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
      </KeyboardAvoidingView>
    </Modal>
  );
}
