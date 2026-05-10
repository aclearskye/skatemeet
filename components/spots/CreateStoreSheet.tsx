import { useAuthContext } from "@/lib/context/use-auth-context";
import { createShop, uploadShopPhoto, UserShop } from "@/lib/stores/skateStores";
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
  onShopCreated: (shop: UserShop) => void;
  initialCoordinates: { latitude: number; longitude: number };
};

export function CreateStoreSheet({ visible, onClose, onShopCreated, initialCoordinates }: Props) {
  const insets = useSafeAreaInsets();
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
        photo_url = await uploadShopPhoto(session.user.id, photoUri);
      }
      const shop = await createShop(
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
      onShopCreated(shop);
      reset();
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message ?? "Failed to create store. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const step1Valid = name.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>ADD STORE</Text>
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
              style={[styles.primaryBtn, step === 1 && !step1Valid && styles.primaryBtnDisabled]}
              disabled={step === 1 && !step1Valid}
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
                <ActivityIndicator size="small" color={C.onSecondary} />
              ) : (
                <Text style={styles.primaryBtnText}>SUBMIT STORE</Text>
              )}
            </TouchableOpacity>
          )}
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
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  stepDot: { width: 8, height: 8, backgroundColor: C.border },
  stepDotActive: { backgroundColor: C.secondary },
  stepLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 1,
    marginLeft: 6,
  },
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
  inputMultiline: { minHeight: 80, paddingTop: 12 },
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
  photoPreviewWrap: { position: "relative" },
  photoPreview: { width: "100%", aspectRatio: 16 / 9 },
  removePhotoBtn: { position: "absolute", top: 8, right: 8 },
  errorBanner: {
    marginTop: 16,
    backgroundColor: C.errorContainer,
    borderWidth: 1,
    borderColor: C.errorBorder,
    padding: 12,
  },
  errorText: { fontFamily: F.body, fontSize: 13, color: C.error },
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
    backgroundColor: C.secondary,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.onSecondary,
    letterSpacing: 1,
  },
});
