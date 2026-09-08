import { PickedPhoto, pickPhotoFromLibrary } from "@/lib/storage";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  photoUri: string | null;
  onPick: (photo: PickedPhoto) => void;
  onRemove: () => void;
  errorMsg?: string | null;
};

export function PhotoPickerStep({ photoUri, onPick, onRemove, errorMsg }: Props) {
  async function handlePick() {
    const photo = await pickPhotoFromLibrary();
    if (photo) onPick(photo);
  }

  return (
    <View style={styles.section}>
      <Text style={styles.fieldLabel}>PHOTO (OPTIONAL)</Text>
      {photoUri ? (
        <View style={styles.photoPreviewWrap}>
          <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
          <TouchableOpacity style={styles.removePhotoBtn} onPress={onRemove}>
            <Ionicons name="close-circle" size={26} color={C.error} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.photoBtn} onPress={handlePick} activeOpacity={0.75}>
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
  photoBtnText: { fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: 1 },
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
});
