import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MAX_SKATER_TAGS } from "@/lib/posts/types";
import { useProfileSearch } from "@/lib/profiles/hooks/useProfileSearch";
import { C } from "@/lib/theme";
import { styles } from "./SkaterTagPicker.styles";

export type TaggedSkater = { profileId: string; username: string };

type Props = {
  visible: boolean;
  selected: TaggedSkater[];
  // Called once, on SAVE, with the new selection (then onClose).
  onChange: (selected: TaggedSkater[]) => void;
  // Back / hardware back: closes without applying changes.
  onClose: () => void;
};

// Search results already exclude blocked pairs and private non-friends
// (RLS), and create_post_draft re-checks server-side.
export function SkaterTagPicker({ visible, selected, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const { results, isSearching, enabled } = useProfileSearch(query.trim());
  // Picks are a draft until SAVE, so backing out leaves the tags as they were.
  const [draft, setDraft] = useState<TaggedSkater[]>(selected);
  useEffect(() => {
    if (visible) {
      setDraft(selected);
      setQuery("");
    }
    // Re-seed only when the picker opens, not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const isFull = draft.length >= MAX_SKATER_TAGS;

  function toggle(skater: TaggedSkater) {
    if (draft.some((s) => s.profileId === skater.profileId)) {
      setDraft(draft.filter((s) => s.profileId !== skater.profileId));
    } else if (!isFull) {
      setDraft([...draft, skater]);
    }
  }

  function save() {
    onChange(draft);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Back without saving">
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.title}>TAG SKATERS</Text>
          <Text style={styles.count}>
            {draft.length}/{MAX_SKATER_TAGS}
          </Text>
        </View>

        {draft.length > 0 && (
          <View style={styles.chips}>
            {draft.map((s) => (
              <TouchableOpacity key={s.profileId} style={styles.chip} onPress={() => toggle(s)} activeOpacity={0.75}>
                <Text style={styles.chipText}>@{s.username.toUpperCase()}</Text>
                <Ionicons name="close" size={12} color={C.onPrimary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Search usernames"
          placeholderTextColor={C.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {isSearching ? (
          <ActivityIndicator color={C.primary} style={styles.spinner} />
        ) : (
          <FlatList
          // Search box is at the top; dragging the results drops the keyboard
          // so the end of the list can be reached.
          keyboardDismissMode="on-drag"
            data={enabled ? results : []}
            keyExtractor={(r) => r.profileId}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.empty}>{enabled ? "NO SKATERS FOUND" : "TYPE AT LEAST 3 CHARACTERS"}</Text>
            }
            renderItem={({ item }) => {
              const isSelected = draft.some((s) => s.profileId === item.profileId);
              return (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => toggle({ profileId: item.profileId, username: item.username })}
                  disabled={!isSelected && isFull}
                  activeOpacity={0.75}
                >
                  <Text style={styles.username}>@{item.username}</Text>
                  <Ionicons
                    name={isSelected ? "checkmark-circle" : "add-circle-outline"}
                    size={22}
                    color={isSelected ? C.primary : C.muted}
                  />
                </TouchableOpacity>
              );
            }}
          />
        )}

        <TouchableOpacity style={styles.doneBtn} onPress={save} activeOpacity={0.85}>
          <Text style={styles.doneText}>SAVE TAGS</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
