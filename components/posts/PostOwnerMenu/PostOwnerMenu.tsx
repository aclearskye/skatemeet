import { useState } from "react";
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAvoidingView } from "@/lib/shared/keyboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useToast } from "@/lib/context/toast-context";
import type { EntityTagOption } from "@/lib/posts/entityTagOptions";
import { PostError } from "@/lib/posts/errors";
import { useEntityTagLabel } from "@/lib/posts/hooks/useEntityTagLabel";
import { usePostOwnerActions } from "@/lib/posts/hooks/usePostOwnerActions";
import type { PostWithPeople } from "@/lib/posts/listQueries";
import { MAX_CAPTION_LENGTH } from "@/lib/posts/types";
import { C } from "@/lib/theme";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EntityTagPicker } from "@/components/posts/EntityTagPicker";
import { SkaterTagPicker, type TaggedSkater } from "@/components/posts/SkaterTagPicker";
import { styles } from "./PostOwnerMenu.styles";

type Props = {
  post: PostWithPeople;
  visible: boolean;
  onClose: () => void;
};

// Edit (caption, spot tag, skater tags -- not the media), pin, archive,
// delete. Posts can't be reordered (md/media_posts.md §1).
export function PostOwnerMenu({ post, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { pin, archive, remove, edit, isBusy } = usePostOwnerActions();
  const { data: currentLabel } = useEntityTagLabel(post.entityTag);
  const [mode, setMode] = useState<"menu" | "edit">("menu");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [caption, setCaption] = useState(post.caption ?? "");
  const [entity, setEntity] = useState<EntityTagOption | null | undefined>(undefined);
  const initialSkaters = [...post.taggedSkaters, ...post.pendingSkaters].map((s) => ({
    profileId: s.profileId,
    username: s.username,
  }));
  const [skaters, setSkaters] = useState<TaggedSkater[]>(initialSkaters);
  const [pickEntity, setPickEntity] = useState(false);
  const [pickSkaters, setPickSkaters] = useState(false);
  // Where to go once "discard changes?" is confirmed: back to the menu, or
  // out of the sheet entirely.
  const [confirmDiscard, setConfirmDiscard] = useState<"menu" | "close" | null>(null);

  const isDirty =
    caption !== (post.caption ?? "") ||
    entity !== undefined ||
    skaters.map((s) => s.profileId).join() !== initialSkaters.map((s) => s.profileId).join();

  function resetEdits() {
    setCaption(post.caption ?? "");
    setEntity(undefined);
    setSkaters(initialSkaters);
  }

  function leaveEdit(to: "menu" | "close") {
    if (mode === "edit" && isDirty) {
      setConfirmDiscard(to);
      return;
    }
    resetEdits();
    if (to === "menu") setMode("menu");
    else onClose();
  }

  const isPublished = post.status === "published";
  const isArchived = post.archivedAt != null;

  async function run(action: () => Promise<unknown>, done: string) {
    try {
      await action();
      showToast({ message: done, variant: "success" });
      onClose();
    } catch (e) {
      showToast({ message: (e instanceof PostError ? e.message : "Something went wrong — try again.").toUpperCase(), variant: "danger" });
    }
  }

  // `undefined` = untouched (keep the current tag), `null` = removed.
  const entityText =
    entity === undefined
      ? currentLabel
        ? `${currentLabel.kindLabel} · ${currentLabel.name}`
        : "TAG A SPOT, DIY OR STORE"
      : entity
        ? `${entity.kindLabel} · ${entity.name}`
        : "TAG A SPOT, DIY OR STORE";

  function saveEdit() {
    run(
      () =>
        edit({
          postId: post.postId,
          caption,
          entityTag: entity === undefined ? post.entityTag : entity?.tag ?? null,
          taggedProfileIds: skaters.map((s) => s.profileId),
        }),
      caption.trim() !== (post.caption ?? "") ? "SAVED — CAPTION CHANGES ARE CHECKED FIRST" : "POST UPDATED"
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => leaveEdit(mode === "edit" ? "menu" : "close")}
    >
      <KeyboardAvoidingView style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => leaveEdit("close")} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {isBusy && <ActivityIndicator color={C.primary} style={styles.busy} />}
          {mode === "menu" ? (
            <>
              <MenuRow icon="create-outline" label="EDIT" onPress={() => setMode("edit")} />
              {isPublished && !isArchived && (
                <MenuRow
                  icon={post.pinnedAt ? "pin" : "pin-outline"}
                  label={post.pinnedAt ? "UNPIN" : "PIN TO PROFILE"}
                  onPress={() => run(() => pin({ postId: post.postId, pinned: !post.pinnedAt }), post.pinnedAt ? "UNPINNED" : "PINNED")}
                />
              )}
              <MenuRow
                icon="archive-outline"
                label={isArchived ? "UNARCHIVE" : "ARCHIVE"}
                onPress={() => run(() => archive({ postId: post.postId, archived: !isArchived }), isArchived ? "BACK ON YOUR PROFILE" : "ARCHIVED")}
              />
              <MenuRow icon="trash-outline" label="DELETE" danger onPress={() => setConfirmDelete(true)} />
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.75}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.editHeader}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => leaveEdit("menu")}
                  hitSlop={12}
                  accessibilityLabel="Back"
                >
                  <Ionicons name="arrow-back" size={22} color={C.text} />
                </TouchableOpacity>
                <Text style={styles.editTitle}>EDIT POST</Text>
                <View style={styles.backBtn} />
              </View>
              <Text style={styles.label}>CAPTION</Text>
              <TextInput
                style={styles.caption}
                value={caption}
                onChangeText={setCaption}
                maxLength={MAX_CAPTION_LENGTH}
                multiline
                textAlignVertical="top"
                placeholder="Say something about it"
                placeholderTextColor={C.muted}
              />
              <TouchableOpacity style={styles.tagRow} onPress={() => setPickEntity(true)} activeOpacity={0.75}>
                <Ionicons name="location-outline" size={18} color={C.primary} />
                <Text style={styles.tagText} numberOfLines={1}>{entityText}</Text>
                {(entity ?? (entity === undefined && post.entityTag)) ? (
                  <TouchableOpacity onPress={() => setEntity(null)} hitSlop={10} accessibilityLabel="Remove spot tag">
                    <Ionicons name="close" size={16} color={C.muted} />
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity style={styles.tagRow} onPress={() => setPickSkaters(true)} activeOpacity={0.75}>
                <Ionicons name="people-outline" size={18} color={C.primary} />
                <Text style={styles.tagText} numberOfLines={1}>
                  {skaters.length ? skaters.map((s) => `@${s.username}`).join(", ") : "TAG SKATERS"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!isDirty || isBusy) && styles.saveBtnDisabled]}
                onPress={saveEdit}
                disabled={!isDirty || isBusy}
                activeOpacity={0.85}
              >
                <Text style={styles.saveText}>SAVE CHANGES</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => leaveEdit("close")} activeOpacity={0.75}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this post?"
        message="It's gone for good, including from anyone's Saved and Tagged in."
        confirmLabel="DELETE"
        onConfirm={() => {
          setConfirmDelete(false);
          run(() => remove(post.postId), "POST DELETED");
        }}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        visible={confirmDiscard != null}
        title="Discard your changes?"
        message="Your edits to this post won't be saved."
        confirmLabel="DISCARD"
        onConfirm={() => {
          const to = confirmDiscard;
          setConfirmDiscard(null);
          resetEdits();
          if (to === "menu") setMode("menu");
          else onClose();
        }}
        onCancel={() => setConfirmDiscard(null)}
      />
      <EntityTagPicker
        visible={pickEntity}
        onSelect={(o) => {
          setEntity(o);
          setPickEntity(false);
        }}
        onClose={() => setPickEntity(false)}
      />
      <SkaterTagPicker
        visible={pickSkaters}
        selected={skaters}
        onChange={setSkaters}
        onClose={() => setPickSkaters(false)}
      />
    </Modal>
  );
}

function MenuRow({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={icon} size={20} color={danger ? C.error : C.text} />
      <Text style={[styles.rowText, danger && styles.rowTextDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}
