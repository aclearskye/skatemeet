import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./BanUserSheet.styles";

type Props = {
  visible: boolean;
  username: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
};

export function BanUserSheet({ visible, username, onClose, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setReason("");
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [visible]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message ?? "Failed to ban user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isValid = reason.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>BAN @{username}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color={C.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.warning}>
              This is permanent — there is no auto-expiry. The account is signed out and
              locked out of the app until an admin manually unbans it.
            </Text>

            <Text style={styles.fieldLabel}>REASON</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Why is this user being banned?"
              placeholderTextColor={C.muted}
              value={reason}
              onChangeText={setReason}
              maxLength={300}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />

            {errorMsg && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, (!isValid || isSubmitting) && styles.primaryBtnDisabled]}
            disabled={!isValid || isSubmitting}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={C.onError} />
            ) : (
              <Text style={styles.primaryBtnText}>BAN USER</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
