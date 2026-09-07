import { MultiStepSheet } from "@/components/common/MultiStepSheet";
import { PhotoPickerStep } from "@/components/common/PhotoPickerStep";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { createStore, uploadStorePhoto } from "@/lib/stores/mutations";
import { UserStore } from "@/lib/stores/types";
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
  onStoreCreated: (store: UserStore) => void;
  initialCoordinates: { latitude: number; longitude: number };
};

export function CreateStoreSheet({
  visible,
  onClose,
  onStoreCreated,
  initialCoordinates,
}: Props) {
  const { session } = useAuthContext();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function reset() {
    setStep(1);
    setName("");
    setAddress("");
    setPhone("");
    setWebsite("");
    setOpeningHours("");
    setDescription("");
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
        photo_url = await uploadStorePhoto(session.user.id, photoUri);
      }
      const store = await createStore(
        {
          name: name.trim(),
          address: address.trim(),
          latitude: initialCoordinates.latitude,
          longitude: initialCoordinates.longitude,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
          opening_hours: openingHours.trim() || undefined,
          description: description.trim() || undefined,
          photo_url,
        },
        session.user.id
      );
      onStoreCreated(store);
      reset();
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message ?? "Failed to create store. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MultiStepSheet
      visible={visible}
      onClose={handleClose}
      title="ADD STORE"
      accent={C.secondary}
      onAccent={C.onSecondary}
      step={step}
      totalSteps={3}
      onBack={() => setStep((s) => s - 1)}
      onNext={() => setStep((s) => s + 1)}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      isCurrentStepValid={step === 1 ? name.trim().length > 0 : true}
      submitLabel="SUBMIT STORE"
    >
      {step === 1 && (
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>STORE NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Element Skate Shop"
            placeholderTextColor={C.muted}
            value={name}
            onChangeText={setName}
            maxLength={80}
            returnKeyType="next"
            autoFocus
          />
          <Text style={[styles.fieldLabel, { marginTop: 24 }]}>ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="Street address"
            placeholderTextColor={C.muted}
            value={address}
            onChangeText={setAddress}
            maxLength={200}
            returnKeyType="next"
          />
        </View>
      )}

      {step === 2 && (
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>PHONE (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="+1 555 000 0000"
            placeholderTextColor={C.muted}
            value={phone}
            onChangeText={setPhone}
            maxLength={30}
            keyboardType="phone-pad"
            returnKeyType="next"
          />
          <Text style={[styles.fieldLabel, { marginTop: 24 }]}>WEBSITE (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://…"
            placeholderTextColor={C.muted}
            value={website}
            onChangeText={setWebsite}
            maxLength={200}
            keyboardType="url"
            autoCapitalize="none"
            returnKeyType="next"
          />
          <Text style={[styles.fieldLabel, { marginTop: 24 }]}>OPENING HOURS (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Mon–Fri 10–6, Sat 11–5"
            placeholderTextColor={C.muted}
            value={openingHours}
            onChangeText={setOpeningHours}
            maxLength={100}
            returnKeyType="next"
          />
          <Text style={[styles.fieldLabel, { marginTop: 24 }]}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="What's special about this shop?"
            placeholderTextColor={C.muted}
            value={description}
            onChangeText={setDescription}
            maxLength={400}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
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
  inputMultiline: { minHeight: 80, paddingTop: 12 },
});
