import { useState } from "react";
import { ActivityIndicator, Platform, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { PhotoSource } from "@/lib/storage";
import { C } from "@/lib/theme";
import { PhotoSourceSheet } from "@/components/common/PhotoSourceSheet";
import { styles } from "./PhotoUploadButton.styles";

type Props = {
  onPick: (source: PhotoSource) => void;
  isLoading: boolean;
  // Disabled until the skater has checked in here.
  disabled: boolean;
  accent: string;
  onAccent: string;
};

// Square "add photo" button. On a phone it asks camera or library first; on
// web there's no camera choice, so it opens the browser's file picker
// straight away.
export function PhotoUploadButton({ onPick, isLoading, disabled, accent, onAccent }: Props) {
  const [isChoosing, setIsChoosing] = useState(false);

  function handlePress() {
    if (Platform.OS === "web") onPick("library");
    else setIsChoosing(true);
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: accent, borderColor: accent }, disabled && styles.btnDisabled]}
        onPress={handlePress}
        disabled={disabled || isLoading}
        activeOpacity={0.85}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Add a photo"
        accessibilityState={{ disabled: disabled || isLoading, busy: isLoading }}
        accessibilityHint={disabled ? "Check in here to add a photo" : undefined}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={onAccent} />
        ) : disabled ? (
          <Ionicons name="lock-closed" size={18} color={C.muted} />
        ) : (
          <MaterialCommunityIcons name="camera-plus" size={22} color={onAccent} />
        )}
      </TouchableOpacity>
      {Platform.OS !== "web" && (
        <PhotoSourceSheet
          visible={isChoosing}
          accent={accent}
          onAccent={onAccent}
          onPick={onPick}
          onClose={() => setIsChoosing(false)}
        />
      )}
    </>
  );
}
