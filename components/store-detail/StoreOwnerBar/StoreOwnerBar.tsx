import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FollowButton } from "@/components/profile/FollowButton";
import { useOpenConversation } from "@/lib/messages/hooks/useOpenConversation";
import { storeImageUrl } from "@/lib/storeAccounts/queries";
import type { StorePage } from "@/lib/storeAccounts/types";
import { C } from "@/lib/theme";
import { styles } from "./StoreOwnerBar.styles";

type Props = {
  page: StorePage;
  // A Store account viewing someone else's store can't follow or message it.
  viewerIsStore: boolean;
};

// Shown on a claimed store's page: the owner's logo, an "official" badge,
// and Follow / Message for skaters, or Edit page for the owner.
export function StoreOwnerBar({ page, viewerIsStore }: Props) {
  const router = useRouter();
  const { openChat, isOpening } = useOpenConversation();
  const followerLabel = `${page.followerCount} ${page.followerCount === 1 ? "FOLLOWER" : "FOLLOWERS"}`;

  return (
    <View style={styles.row}>
      {page.logoPath ? (
        <Image source={{ uri: storeImageUrl(page.logoPath) }} style={styles.logo} />
      ) : (
        <View style={[styles.logo, styles.logoPlaceholder]}>
          <Ionicons name="storefront-outline" size={20} color={C.muted} />
        </View>
      )}
      <View style={styles.text}>
        <View style={styles.badge}>
          <Ionicons name="checkmark-circle" size={13} color={C.secondary} />
          <Text style={styles.badgeText}>OFFICIAL STORE</Text>
        </View>
        <Text style={styles.followers}>{followerLabel}</Text>
      </View>

      {page.isOwner ? (
        <TouchableOpacity style={styles.editBtn} onPress={() => router.push("/(tabs)/profile")} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={14} color={C.text} />
          <Text style={styles.editText}>EDIT PAGE</Text>
        </TouchableOpacity>
      ) : viewerIsStore ? null : (
        <View style={styles.actions}>
          {page.username ? <FollowButton profileId={page.ownerId} username={page.username} /> : null}
          {page.canMessage ? (
            <TouchableOpacity
              style={styles.messageBtn}
              onPress={() => openChat(page.ownerId)}
              disabled={isOpening}
              activeOpacity={0.8}
              accessibilityLabel={`Message ${page.name}`}
            >
              <Ionicons name="mail" size={16} color={C.onTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}
