import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { fetchPostsByIds } from "@/lib/posts/listQueries";
import { C, F } from "@/lib/theme";
import { queryKeys } from "@/utils/queryKeys";
import { PostViewer } from "@/components/posts/PostViewer";

// A single post: share links, push-notification taps. Readable logged out
// on web (app/_layout.tsx lets this route through); RLS limits anon viewers
// to published posts from public profiles.
export default function PostScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthContext();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: queryKeys.post(postId ?? ""),
    queryFn: () => fetchPostsByIds([postId!]),
    enabled: !!postId,
  });

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace(session ? "/(tabs)" : "/Login");
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator color={C.primary} style={styles.centered} />
      ) : posts.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.empty}>THIS POST ISN&apos;T AVAILABLE</Text>
        </View>
      ) : (
        <PostViewer posts={posts} />
      )}
      <TouchableOpacity onPress={handleBack} hitSlop={12} style={[styles.back, { top: insets.top + 12 }]} accessibilityLabel="Back">
        <Ionicons name="arrow-back" size={24} color={C.text} />
      </TouchableOpacity>
      {!session && (
        <TouchableOpacity style={[styles.signIn, { top: insets.top + 8 }]} onPress={() => router.push("/Login")} activeOpacity={0.85}>
          <Text style={styles.signInText}>SIGN IN</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgLowest },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { fontFamily: F.mono, fontSize: 12, color: C.muted, letterSpacing: 1.5 },
  back: { position: "absolute", left: 16 },
  signIn: { position: "absolute", right: 16, backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 8 },
  signInText: { fontFamily: F.mono, fontSize: 11, color: C.onPrimary, letterSpacing: 1 },
});
