import ProfileView from "@/components/profile/ProfileView";
import { type Profile } from "@/lib/context/use-auth-context";
import { supabase } from "@/lib/supabaseClient";
import { C, F } from "@/lib/theme";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("profile_id", userId)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError("Profile not found.");
        } else {
          setProfile(data as Profile);
        }
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Something went wrong."}</Text>
      </View>
    );
  }

  return <ProfileView profile={profile} isOwnProfile={false} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily: F.monoRegular,
    fontSize: 13,
    color: C.muted,
  },
});
