import { useState } from "react";
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { pickPhotoFromLibrary } from "@/lib/storage";
import { uploadStoreImage } from "@/lib/storeAccounts/mutations";
import { storeImageUrl } from "@/lib/storeAccounts/queries";
import { C } from "@/lib/theme";
import { styles } from "./StoreImagePicker.styles";

type Props = {
  label: string;
  path: string | null;
  onChange: (path: string | null) => void;
  shape: "square" | "wide";
};

// Picks an image, uploads it to the store-images bucket, and reports the
// object path (saved later with the rest of the details).
export function StoreImagePicker({ label, path, onChange, shape }: Props) {
  const { profile } = useAuthContext();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async () => {
    if (!profile) return;
    setError(null);
    const photo = await pickPhotoFromLibrary();
    if (!photo) return;
    setIsUploading(true);
    try {
      onChange(await uploadStoreImage(profile.profile_id, photo.uri, photo.mimeType));
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const previewStyle = shape === "square" ? styles.square : styles.wide;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={[styles.frame, previewStyle]} onPress={handlePick} activeOpacity={0.8} disabled={isUploading}>
        {isUploading ? (
          <ActivityIndicator color={C.primary} />
        ) : path ? (
          <Image source={{ uri: storeImageUrl(path) }} style={styles.image} resizeMode="cover" />
        ) : (
          <Ionicons name="image-outline" size={24} color={C.muted} />
        )}
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity onPress={handlePick} disabled={isUploading} hitSlop={8}>
          <Text style={styles.action}>{path ? "REPLACE" : "ADD IMAGE"}</Text>
        </TouchableOpacity>
        {path ? (
          <TouchableOpacity onPress={() => onChange(null)} disabled={isUploading} hitSlop={8}>
            <Text style={styles.remove}>REMOVE</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
