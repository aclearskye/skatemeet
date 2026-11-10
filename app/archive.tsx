import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { C, F } from "@/lib/theme";
import { PostGrid } from "@/components/posts/PostGrid";

// Settings → Archive: the author's archived posts. Opening one shows the
// post menu, where Unarchive puts it back on the profile.
export default function ArchiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthContext();
  const userId = session?.user.id;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>ARCHIVE</Text>
      </View>
      <ScrollView>
        {userId ? (
          <PostGrid source={`archived:${userId}`} emptyIcon="archive-outline" emptyLabel="NO ARCHIVED POSTS" />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  heading: {
    fontFamily: F.heading,
    fontSize: 20,
    color: C.text,
    letterSpacing: 2,
  },
});
