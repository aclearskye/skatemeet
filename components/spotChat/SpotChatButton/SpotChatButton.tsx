import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useSpotChatRoom } from "@/lib/spotChat/hooks/useSpotChatRoom";
import type { SpotChatSpotRef } from "@/lib/spotChat/types";
import { styles } from "./SpotChatButton.styles";

type Props = {
  spotRef: SpotChatSpotRef;
  spotName: string;
  isDiy: boolean;
  accent: string;
  onAccent: string;
  // "strip" hangs under the map preview card; "section" sits in the spot page.
  variant: "strip" | "section";
  onOpen?: () => void;
};

// Spots and DIY spots only -- never rendered for stores. Signed-in only.
export function SpotChatButton({ spotRef, spotName, isDiy, accent, onAccent, variant, onOpen }: Props) {
  const router = useRouter();
  const { session } = useAuthContext();
  const { data: room } = useSpotChatRoom(spotRef);

  if (!session) return null;

  const memberCount = room?.memberCount ?? 0;
  const label = room?.isMember ? "OPEN CHAT" : "JOIN CHAT";
  const meta =
    memberCount === 0 ? "BE THE FIRST IN HERE" : `${memberCount} ${memberCount === 1 ? "SKATER" : "SKATERS"} IN CHAT`;

  function handlePress() {
    router.push({
      // Cast until expo-router regenerates its typed routes for the new screen.
      pathname: "/spot-chat" as never,
      params: {
        spotId: spotRef.spotId ?? "",
        osmPlaceId: spotRef.osmSpotPlaceId ?? "",
        name: spotName,
        diy: isDiy ? "1" : "0",
      },
    });
    onOpen?.();
  }

  return (
    <TouchableOpacity
      style={[styles.container, variant === "strip" ? styles.strip : styles.section]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${label.toLowerCase()} for ${spotName}`}
    >
      <Ionicons name="chatbubbles-outline" size={20} color={accent} />
      <View style={styles.textColumn}>
        <Text style={styles.title}>SPOT CHAT</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <View style={[styles.cta, { backgroundColor: accent }]}>
        <Text style={[styles.ctaText, { color: onAccent }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}
