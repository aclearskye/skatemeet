import { useAuthContext } from "@/lib/context/use-auth-context";
import { createSpotCard, SpotCard } from "@/lib/spots/skateSpots";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCardCreated: (card: SpotCard) => void;
  spotId: string | null;
  osmPlaceId: string | null;
  isDiy: boolean;
};

export function AddSpotCardSheet({ visible, onClose, onCardCreated, spotId, osmPlaceId, isDiy }: Props) {
  const insets = useSafeAreaInsets();
  const { session } = useAuthContext();

  const accent = isDiy ? C.tertiary : C.primary;
  const onAccent = isDiy ? C.onTertiary : C.onPrimary;

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

  function handleStarPress(star: number) {
    setRating((prev) => (prev === star ? null : star));
  }

  async function handleSubmit() {
    if (!session) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const card = await createSpotCard(
        {
          spot_id: spotId,
          osm_place_id: osmPlaceId,
          heading: heading.trim(),
          rating,
          comment: comment.trim(),
        },
        session.user.id
      );
      onCardCreated(card);
      reset();
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message ?? "Failed to submit card. Please try again.");
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
          <Text style={styles.title}>ADD CARD</Text>
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
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleStarPress(star)}
                  hitSlop={8}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={rating !== null && star <= rating ? "star" : "star-outline"}
                    size={30}
                    color={rating !== null && star <= rating ? accent : C.border}
                  />
                </TouchableOpacity>
              ))}
            </View>

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
            style={[styles.primaryBtn, { backgroundColor: accent }, (!isValid || isSubmitting) && styles.primaryBtnDisabled]}
            disabled={!isValid || isSubmitting}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={onAccent} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: onAccent }]}>SUBMIT CARD</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontFamily: F.heading,
    fontSize: 20,
    color: C.text,
    letterSpacing: 1,
  },
  closeBtn: { padding: 4 },
  body: { flex: 1 },
  section: { padding: 20 },
  fieldLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 2,
    marginBottom: 10,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    color: C.text,
    fontFamily: F.body,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputMultiline: { minHeight: 100, paddingTop: 12 },
  starsRow: {
    flexDirection: "row",
    gap: 10,
  },
  errorBanner: {
    marginTop: 16,
    backgroundColor: C.errorContainer,
    borderWidth: 1,
    borderColor: C.errorBorder,
    padding: 12,
  },
  errorText: { fontFamily: F.body, fontSize: 13, color: C.error },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  primaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: {
    fontFamily: F.mono,
    fontSize: 12,
    letterSpacing: 1,
  },
});
