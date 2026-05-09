import { useAuthContext } from "@/lib/context/use-auth-context";
import { createSpot, SkateSpot, SpotType, uploadSpotPhoto } from "@/lib/spots/skateSpots";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
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
  onSpotCreated: (spot: SkateSpot) => void;
  initialCoordinates: { latitude: number; longitude: number };
};

const SPOT_TYPES: { key: SpotType; label: string }[] = [
  { key: "street", label: "STREET" },
  { key: "diy", label: "DIY" },
  { key: "park", label: "PARK" },
  { key: "indoor", label: "INDOOR" },
];

const DIFFICULTY_LABELS = ["", "MELLOW", "MELLOW", "MEDIUM", "GNARLY", "GNARLY"];

export function CreateSpotSheet({ visible, onClose, onSpotCreated, initialCoordinates }: Props) {
  const insets = useSafeAreaInsets();
  const { session } = useAuthContext();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [spotType, setSpotType] = useState<SpotType>("street");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function reset() {
    setStep(1);
    setName("");
    setSpotType("street");
    setDescription("");
    setDifficulty(null);
    setPhotoUri(null);
    setIsSubmitting(false);
    setErrorMsg(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!session) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      let photo_url: string | undefined;
      if (photoUri) {
        photo_url = await uploadSpotPhoto(session.user.id, photoUri);
      }
      const spot = await createSpot(
        {
          name: name.trim(),
          type: spotType,
          description: description.trim() || undefined,
          latitude: initialCoordinates.latitude,
          longitude: initialCoordinates.longitude,
          photo_url,
          difficulty: difficulty ?? undefined,
        },
        session.user.id
      );
      onSpotCreated(spot);
      reset();
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message ?? "Failed to create spot. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>ADD SPOT</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color={C.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.stepRow}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={[styles.stepDot, s <= step && styles.stepDotActive]} />
          ))}
          <Text style={styles.stepLabel}>STEP {step} OF 3</Text>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {step === 1 && (
            <View style={styles.section}>
              <Text style={styles.fieldLabel}>SPOT NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Southbank Ledges"
                placeholderTextColor={C.muted}
                value={name}
                onChangeText={setName}
                maxLength={80}
                returnKeyType="next"
                autoFocus
              />
              <Text style={[styles.fieldLabel, { marginTop: 24 }]}>SPOT TYPE</Text>
              <View style={styles.typeRow}>
                {SPOT_TYPES.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.typeChip, spotType === key && styles.typeChipActive]}
                    onPress={() => setSpotType(key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.typeChipText, spotType === key && styles.typeChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.section}>
              <Text style={styles.fieldLabel}>DESCRIPTION</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="What makes this spot special? Any obstacles or access notes?"
                placeholderTextColor={C.muted}
                value={description}
                onChangeText={setDescription}
                maxLength={400}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={[styles.fieldLabel, { marginTop: 24 }]}>DIFFICULTY</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setDifficulty(difficulty === star ? null : star)}
                    style={styles.starBtn}
                    hitSlop={4}
                  >
                    <Ionicons
                      name={difficulty != null && star <= difficulty ? "star" : "star-outline"}
                      size={28}
                      color={difficulty != null && star <= difficulty ? C.primary : C.border}
                    />
                  </TouchableOpacity>
                ))}
                {difficulty != null && (
                  <Text style={styles.difficultyLabel}>{DIFFICULTY_LABELS[difficulty]}</Text>
                )}
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.section}>
              <Text style={styles.fieldLabel}>PHOTO (OPTIONAL)</Text>
              {photoUri ? (
                <View style={styles.photoPreviewWrap}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotoUri(null)}>
                    <Ionicons name="close-circle" size={26} color={C.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} activeOpacity={0.75}>
                  <Ionicons name="camera-outline" size={24} color={C.muted} />
                  <Text style={styles.photoBtnText}>ADD PHOTO</Text>
                </TouchableOpacity>
              )}
              {errorMsg && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => s - 1)}>
              <Text style={styles.backBtnText}>BACK</Text>
            </TouchableOpacity>
          )}
          {step < 3 ? (
            <TouchableOpacity
              style={[styles.primaryBtn, step === 1 && !name.trim() && styles.primaryBtnDisabled]}
              disabled={step === 1 && !name.trim()}
              onPress={() => setStep((s) => s + 1)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>NEXT</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, isSubmitting && styles.primaryBtnDisabled]}
              disabled={isSubmitting}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={C.onPrimary} />
              ) : (
                <Text style={styles.primaryBtnText}>SUBMIT SPOT</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
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
  closeBtn: {
    padding: 4,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  stepDot: {
    width: 8,
    height: 8,
    backgroundColor: C.border,
  },
  stepDotActive: {
    backgroundColor: C.primary,
  },
  stepLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 1,
    marginLeft: 6,
  },
  body: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
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
  inputMultiline: {
    minHeight: 100,
    paddingTop: 12,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  typeChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  typeChipText: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: C.muted,
  },
  typeChipTextActive: {
    color: C.onPrimary,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  starBtn: {
    padding: 4,
  },
  difficultyLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.primary,
    letterSpacing: 1,
    marginLeft: 8,
  },
  photoBtn: {
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: "dashed",
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.surface,
  },
  photoBtnText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },
  photoPreviewWrap: {
    position: "relative",
  },
  photoPreview: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  removePhotoBtn: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  errorBanner: {
    marginTop: 16,
    backgroundColor: C.errorContainer,
    borderWidth: 1,
    borderColor: C.errorBorder,
    padding: 12,
  },
  errorText: {
    fontFamily: F.body,
    fontSize: 13,
    color: C.error,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  backBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  backBtnText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 1,
  },
  primaryBtn: {
    flex: 2,
    backgroundColor: C.primary,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.onPrimary,
    letterSpacing: 1,
  },
});
