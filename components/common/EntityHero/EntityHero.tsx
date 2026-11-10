import type { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { C } from "@/lib/theme";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { TapeChip } from "@/components/common/TapeChip";
import { styles } from "./EntityHero.styles";

const HINT_COLORS = { bg: C.tape, fg: C.onTape };

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
// name and duct-tape labels laid over its bottom edge, and the photo upload
// button pinned top-right.
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
        {/* The name as a big black tape strip, with the same random tilt as
            every other tape. Not pressable. */}
        <DuctTapeLabel
          color={C.bgLowest}
          style={styles.nameTape}
          accessibilityRole="header"
          accessibilityLabel={name}
        >
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
        </DuctTapeLabel>
        {badges}
      </View>

      {action ? (
        <View style={styles.actionCorner} pointerEvents="box-none">
          {action}
          {actionHint ? (
            <TapeChip text={actionHint} colors={HINT_COLORS} size="sm" />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
