import { MultiStepSheet } from "@/components/common/MultiStepSheet";
import { PhotoPickerStep } from "@/components/common/PhotoPickerStep";
import { StarInput } from "@/components/common/StarInput";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { createSpot, SkateSpot, SpotType, uploadSpotPhoto } from "@/lib/spots/skateSpots";
import { C, F } from "@/lib/theme";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSpotCreated: (spot: SkateSpot) => void;
  initialCoordinates: { latitude: number; longitude: number };
  lockedType?: SpotType;
};

const SPOT_TYPES: { key: SpotType; label: string }[] = [
  { key: "street", label: "STREET" },
  { key: "diy", label: "DIY" },
  { key: "park", label: "PARK" },
  { key: "indoor", label: "INDOOR" },
];

const DIFFICULTY_LABELS = ["", "MELLOW", "MELLOW", "MEDIUM", "GNARLY", "GNARLY"];

export function CreateSpotSheet({
  visible,
  onClose,
  onSpotCreated,
  initialCoordinates,
  lockedType,
}: Props) {
  const { session } = useAuthContext();

  const isDiy = lockedType === "diy";
  const accent = isDiy ? C.tertiary : C.primary;
  const onAccent = isDiy ? C.onTertiary : C.onPrimary;

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [spotType, setSpotType] = useState<SpotType>(lockedType ?? "street");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function reset() {
    setStep(1);
    setName("");
    setSpotType(lockedType ?? "street");
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
          type: lockedType ?? spotType,
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
    <MultiStepSheet
      visible={visible}
      onClose={handleClose}
      title={isDiy ? "ADD DIY SPOT" : "ADD SPOT"}
      accent={accent}
      onAccent={onAccent}
      step={step}
      totalSteps={3}
      onBack={() => setStep((s) => s - 1)}
      onNext={() => setStep((s) => s + 1)}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      isCurrentStepValid={step === 1 ? name.trim().length > 0 : true}
      submitLabel="SUBMIT SPOT"
    >
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
          {!lockedType && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 24 }]}>SPOT TYPE</Text>
              <View style={styles.typeRow}>
                {SPOT_TYPES.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.typeChip,
                      spotType === key && { backgroundColor: accent, borderColor: accent },
                    ]}
                    onPress={() => setSpotType(key)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[styles.typeChipText, spotType === key && { color: onAccent }]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
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
            <StarInput
              value={difficulty}
              onChange={setDifficulty}
              size={28}
              gap={4}
              hitSlop={4}
              accent={accent}
            />
            {difficulty != null && (
              <Text style={[styles.difficultyLabel, { color: accent }]}>
                {DIFFICULTY_LABELS[difficulty]}
              </Text>
            )}
          </View>
        </View>
      )}

      {step === 3 && (
        <PhotoPickerStep
          photoUri={photoUri}
          onPick={setPhotoUri}
          onRemove={() => setPhotoUri(null)}
          errorMsg={errorMsg}
        />
      )}
    </MultiStepSheet>
  );
}

const styles = StyleSheet.create({
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
  typeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  typeChipText: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: C.muted },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  difficultyLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
    marginLeft: 8,
  },
});
