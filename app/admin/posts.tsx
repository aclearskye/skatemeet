import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "@/lib/shared/keyboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCaptionFlagsQueue } from "@/lib/admin/hooks/useCaptionFlagsQueue";
import { useCsamHolds } from "@/lib/admin/hooks/useCsamHolds";
import { useHeldPostsQueue } from "@/lib/admin/hooks/useHeldPostsQueue";
import { useMarkCsamHoldFiled } from "@/lib/admin/hooks/useMarkCsamHoldFiled";
import { useModerateHeldPost } from "@/lib/admin/hooks/useModerateHeldPost";
import { useReviewCaptionFlag } from "@/lib/admin/hooks/useReviewCaptionFlag";
import { AdminError } from "@/lib/admin/mutations";
import { C, F } from "@/lib/theme";
import { CsamHoldCard } from "@/components/admin/CsamHoldCard";
import { HeldPostCard } from "@/components/admin/HeldPostCard";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

type PendingConfirm = { action: "remove" | "csam"; postId: string } | null;

// Post moderation queue (md/media_posts.md §8): posts held by Sightengine
// or user reports, blocked captions, and CSAM holds awaiting an NCA report.
// Reviewer process: never download, screenshot or forward media.
export default function AdminPostsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm>(null);

  const { data: heldPosts = [], isLoading: heldLoading, isError: heldError } = useHeldPostsQueue();
  const { data: captionFlags = [], isLoading: flagsLoading, isError: flagsError } = useCaptionFlagsQueue();
  const { data: csamHolds = [], isLoading: holdsLoading, isError: holdsError } = useCsamHolds();
  const moderate = useModerateHeldPost();
  const reviewFlag = useReviewCaptionFlag();
  const markFiled = useMarkCsamHoldFiled();

  const handleError = (error: unknown) => {
    setErrorMessage(error instanceof AdminError ? error.message : "Something went wrong — try again.");
  };

  function run(id: string, mutate: (opts: { onError: (e: unknown) => void; onSettled: () => void }) => void) {
    setErrorMessage(null);
    setPendingId(id);
    mutate({ onError: handleError, onSettled: () => setPendingId(null) });
  }

  function handleConfirm() {
    if (!confirm) return;
    const { action, postId } = confirm;
    setConfirm(null);
    run(postId, (opts) =>
      moderate.mutate(action === "remove" ? { action, postId, reason: null } : { action, postId }, opts)
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.heading}>POSTS</Text>
          <Text style={styles.subheading} numberOfLines={1}>
            {"// held media, captions, csam holds"}
          </Text>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Keeps a hold card's reference field above the keyboard. */}
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>HELD POSTS</Text>
        {heldLoading ? (
          <ActivityIndicator color={C.primary} style={styles.sectionSpinner} />
        ) : heldError ? (
          <Text style={styles.emptyLabel}>FAILED TO LOAD HELD POSTS</Text>
        ) : heldPosts.length === 0 ? (
          <Text style={styles.emptyLabel}>NO HELD POSTS</Text>
        ) : (
          <View style={styles.list}>
            {heldPosts.map((item) => (
              <HeldPostCard
                key={item.postId}
                item={item}
                onApprove={(postId) => run(postId, (opts) => moderate.mutate({ action: "approve", postId }, opts))}
                onRemove={(postId) => setConfirm({ action: "remove", postId })}
                onSuspectedCsam={(postId) => setConfirm({ action: "csam", postId })}
                isBusy={pendingId === item.postId}
              />
            ))}
          </View>
        )}

        <Text style={[styles.sectionLabel, styles.sectionSpacing]}>BLOCKED CAPTIONS</Text>
        {flagsLoading ? (
          <ActivityIndicator color={C.primary} style={styles.sectionSpinner} />
        ) : flagsError ? (
          <Text style={styles.emptyLabel}>FAILED TO LOAD CAPTION FLAGS</Text>
        ) : captionFlags.length === 0 ? (
          <Text style={styles.emptyLabel}>NO BLOCKED CAPTIONS</Text>
        ) : (
          <View style={styles.list}>
            {captionFlags.map((flag) => (
              <View key={flag.eventId} style={styles.flagCard}>
                <Text style={styles.flagReason}>{(flag.reason ?? "flagged").toUpperCase().replace(/_/g, " ")}</Text>
                <Text style={styles.flagMeta}>@{(flag.username ?? "deleted").toUpperCase()}</Text>
                <Text style={styles.flagText}>{flag.captionText}</Text>
                <TouchableOpacity
                  style={styles.flagBtn}
                  onPress={() => run(flag.eventId, (opts) => reviewFlag.mutate(flag.eventId, opts))}
                  disabled={pendingId === flag.eventId}
                  activeOpacity={0.75}
                >
                  <Text style={styles.flagBtnText}>MARK REVIEWED</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionLabel, styles.sectionSpacing]}>CSAM HOLDS</Text>
        {holdsLoading ? (
          <ActivityIndicator color={C.primary} style={styles.sectionSpinner} />
        ) : holdsError ? (
          <Text style={styles.emptyLabel}>FAILED TO LOAD CSAM HOLDS</Text>
        ) : csamHolds.length === 0 ? (
          <Text style={styles.emptyLabel}>NO CSAM HOLDS</Text>
        ) : (
          <View style={styles.list}>
            {csamHolds.map((hold) => (
              <CsamHoldCard
                key={hold.holdId}
                item={hold}
                onMarkFiled={(holdId, reference) =>
                  run(holdId, (opts) => markFiled.mutate({ holdId, reference }, opts))
                }
                isBusy={pendingId === hold.holdId}
              />
            ))}
          </View>
        )}
      </KeyboardAwareScrollView>

      <ConfirmDialog
        visible={confirm?.action === "remove"}
        title="Remove this post?"
        message="It's taken down for good and the author is notified it broke the community guidelines."
        confirmLabel="REMOVE"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        visible={confirm?.action === "csam"}
        title="Flag as suspected CSAM?"
        message="This bans the account, removes the post everywhere, locks the files as evidence and opens an NCA report task. Don't download, screenshot or forward the media. Report it to the NCA, and optionally the IWF."
        confirmLabel="FLAG CSAM"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
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
  backBtn: { paddingVertical: 2 },
  headerText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  heading: {
    fontFamily: F.heading,
    fontSize: 20,
    color: C.text,
    letterSpacing: 2,
  },
  subheading: {
    flexShrink: 1,
    fontFamily: F.monoRegular,
    fontSize: 13,
    color: C.muted,
    letterSpacing: 0.5,
  },
  errorBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: C.errorContainer,
    borderBottomWidth: 1,
    borderBottomColor: C.errorBorder,
  },
  errorText: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.error,
  },
  scrollContent: {
    padding: 16,
  },
  sectionLabel: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  sectionSpacing: {
    marginTop: 28,
  },
  sectionSpinner: {
    marginVertical: 16,
  },
  emptyLabel: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 0.5,
  },
  list: {
    gap: 12,
  },
  flagCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderVariant,
    padding: 14,
    gap: 6,
  },
  flagReason: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.secondary,
    letterSpacing: 1,
  },
  flagMeta: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
  },
  flagText: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.textVariant,
    lineHeight: 20,
  },
  flagBtn: {
    alignSelf: "flex-start",
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  flagBtnText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },
});
