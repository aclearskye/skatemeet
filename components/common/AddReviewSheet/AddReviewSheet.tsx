import { StarInput } from "@/components/common/StarInput";
import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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
import { styles } from "./AddReviewSheet.styles";

type ReviewPayload = { heading: string; rating: number | null; comment: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  accent: string;
  onAccent: string;
  onSubmit: (payload: ReviewPayload) => Promise<void>;
};

export function AddReviewSheet({ visible, onClose, accent, onAccent, onSubmit }: Props) {
  const insets = useSafeAreaInsets();

  const [heading, setHeading] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function reset() {
    setHeading("");
    setRating(null);
    setComment("");
    setIsSubmitting(false);
    setErrorMsg(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit({ heading: heading.trim(), rating, comment: comment.trim() });
      reset();
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message ?? "Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isValid = heading.trim().length > 0 && comment.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>ADD REVIEW</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color={C.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>HEADING</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Surface Condition"
              placeholderTextColor={C.muted}
              value={heading}
              onChangeText={setHeading}
              maxLength={80}
              returnKeyType="next"
              autoFocus
            />

            <Text style={[styles.fieldLabel, { marginTop: 24 }]}>RATING (OPTIONAL)</Text>
            <StarInput value={rating} onChange={setRating} accent={accent} />

            <Text style={[styles.fieldLabel, { marginTop: 24 }]}>COMMENT</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Describe what you found…"
              placeholderTextColor={C.muted}
              value={comment}
              onChangeText={setComment}
              maxLength={600}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
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
            style={[
              styles.primaryBtn,
              { backgroundColor: accent },
              (!isValid || isSubmitting) && styles.primaryBtnDisabled,
            ]}
            disabled={!isValid || isSubmitting}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={onAccent} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: onAccent }]}>SUBMIT REVIEW</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
