import {
  createEmptyMetadataFormState,
  EntityMetadataStep,
  metadataFormStateToPayload,
  MetadataFormState,
} from "@/components/common/EntityMetadataStep";
import { MultiStepSheet } from "@/components/common/MultiStepSheet";
import { PhotoPickerStep } from "@/components/common/PhotoPickerStep";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { upsertStoreMetadata } from "@/lib/stores/metadataMutations";
import { createStore, linkStorePhoto, uploadStorePhoto } from "@/lib/stores/mutations";
import { UserStore } from "@/lib/stores/types";
import { PickedPhoto } from "@/lib/storage";
import { C, F } from "@/lib/theme";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
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
  const [description, setDescription] = useState("");
  const [metadata, setMetadata] = useState<MetadataFormState>(createEmptyMetadataFormState());
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function reset() {
    setStep(1);
    setName("");
    setAddress("");
    setPhone("");
    setWebsite("");
    setDescription("");
    setMetadata(createEmptyMetadataFormState());
    setPhoto(null);
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
      if (photo) {
        photo_url = await uploadStorePhoto(session.user.id, photo.uri, photo.mimeType);
      }
      const store = await createStore(
        {
          name: name.trim(),
          address: address.trim(),
          latitude: initialCoordinates.latitude,
          longitude: initialCoordinates.longitude,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
          description: description.trim() || undefined,
          photo_url,
        },
        session.user.id
      );
      if (photo_url) {
        await linkStorePhoto({ storeId: store.store_id }, photo_url);
      }
      // Best-effort: metadata capture is fully optional and must never undo
      // or block the already-successful store creation above.
      try {
        await upsertStoreMetadata(store.store_id, null, metadataFormStateToPayload(metadata));
      } catch {
        // ignore — the user can add details later from the store detail screen
      }
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
      totalSteps={4}
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
        <EntityMetadataStep
          value={metadata}
          onChange={setMetadata}
          accent={C.secondary}
          onAccent={C.onSecondary}
          onSkip={() => setStep(4)}
        />
      )}

      {step === 4 && (
        <PhotoPickerStep
          photoUri={photo?.uri ?? null}
          onPick={setPhoto}
          onRemove={() => setPhoto(null)}
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
