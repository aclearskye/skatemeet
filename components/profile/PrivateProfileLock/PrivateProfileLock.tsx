import { useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useProfilePrivacy } from "@/lib/profiles/hooks/useProfilePrivacy";
import { C } from "@/lib/theme";
import { styles } from "./PrivateProfileLock.styles";

// Own-profile only: a lock beside the name while the account is private,
// opening a sheet that switches it back to public. Reads privacy through
// useProfilePrivacy (not the profile prop) so the lock disappears the
// moment "make public" is tapped, rather than after the profile refetch.
export function PrivateProfileLock() {
  const { isPrivate, setIsPrivate } = useProfilePrivacy();
  const [showSheet, setShowSheet] = useState(false);

  function handleMakePublic() {
    setShowSheet(false);
    setIsPrivate(false);
  }

  if (!isPrivate) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.lockBtn}
        onPress={() => setShowSheet(true)}
        activeOpacity={0.7}
        hitSlop={8}
        accessibilityLabel="Your profile is private. Tap to make it public."
      >
        <Ionicons name="lock-closed" size={14} color={C.secondary} />
      </TouchableOpacity>

      <Modal
        visible={showSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSheet(false)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowSheet(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.iconBadge}>
              <Ionicons name="lock-closed" size={22} color={C.onSecondary} />
            </View>
            <Text style={styles.title}>YOUR PROFILE IS PRIVATE</Text>
            <Text style={styles.message}>
              Only your friends can see your profile or find you in search. Make it public to
              let anyone on SkateMeet see it. Messaging stays friends-only either way.
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.keepBtn}
                onPress={() => setShowSheet(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.keepText}>KEEP PRIVATE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.publicBtn}
                onPress={handleMakePublic}
                activeOpacity={0.85}
              >
                <Ionicons name="lock-open" size={14} color={C.onPrimary} />
                <Text style={styles.publicText}>MAKE PUBLIC</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
