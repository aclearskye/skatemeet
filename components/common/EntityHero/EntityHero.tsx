import type { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { C } from "@/lib/theme";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { styles } from "./EntityHero.styles";

type Props = {
  photoUrl: string | null;
  // Shown when there's no photo yet.
  placeholderIcon: keyof typeof Ionicons.glyphMap;
  // Opens the photo viewer.
  onPhotoPress?: () => void;
  name: string;
  // The duct-tape row (type, difficulty, labels, verified...).
  badges?: ReactNode;
  // Top-right control, i.e. the photo upload button.
  action?: ReactNode;
  // Small tape under the action, e.g. why it's locked.
  actionHint?: string | null;
};

// Top of a spot / store detail page: the cover photo with the entity's
// name and duct-tape labels laid over a dark band along its bottom, and the
// photo upload button pinned top-right.
export function EntityHero({ photoUrl, placeholderIcon, onPhotoPress, name, badges, action, actionHint }: Props) {
  return (
    <View style={styles.hero}>
      {photoUrl ? (
        <TouchableOpacity
          style={styles.fill}
          activeOpacity={0.9}
          onPress={onPhotoPress}
          disabled={!onPhotoPress}
          accessibilityRole="imagebutton"
          accessibilityLabel={`Photos of ${name}`}
        >
          <Image source={{ uri: photoUrl }} style={styles.fill} contentFit="cover" />
        </TouchableOpacity>
      ) : (
        <View style={[styles.fill, styles.placeholder]}>
          <Ionicons name={placeholderIcon} size={52} color={C.muted} />
        </View>
      )}

      {/* Over the photo; box-none so taps outside the text still open it. */}
      <View style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.name} numberOfLines={2} accessibilityRole="header">
          {name}
        </Text>
        {badges}
      </View>

      {action ? (
        <View style={styles.actionCorner} pointerEvents="box-none">
          {action}
          {actionHint ? (
            <DuctTapeLabel color={C.tape} style={styles.hintTape}>
              <Text style={styles.hintText}>{actionHint}</Text>
            </DuctTapeLabel>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
