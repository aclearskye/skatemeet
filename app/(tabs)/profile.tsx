import ProfileView from "@/components/profile/ProfileView";
import { StorePageEditor } from "@/components/storeAccount/StorePageEditor";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { C } from "@/lib/theme";
import { ActivityIndicator, View } from "react-native";

export default function ProfileScreen() {
  const { profile } = useAuthContext();

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  // A Store account has no skater profile; its Profile tab edits its store page.
  if (profile.account_type === "store") return <StorePageEditor />;

  return <ProfileView profile={profile} isOwnProfile={true} />;
}
