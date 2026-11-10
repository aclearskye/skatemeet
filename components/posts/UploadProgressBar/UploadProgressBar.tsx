import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "@/lib/context/toast-context";
import { useUploadQueue, type UploadItem } from "@/lib/context/upload-queue-context";
import { VARIANT_COLOR, VARIANT_ICON } from "@/lib/shared/notificationVariant";
import { C } from "@/lib/theme";
import { styles } from "./UploadProgressBar.styles";

function message(item: UploadItem): string {
  if (item.state === "failed") return "Your post didn't upload.";
  if (item.state === "moderating") return "Checking your post…";
  return `Uploading your post… ${Math.round(item.progress * 100)}%`;
}

// Upload progress, drawn as the same card ToastHost uses and in the same
// spot. It steps aside while a toast is on screen, so when moderation
// finishes the queue swaps it for the outcome toast ("YOUR POST IS
// UPLOADED") in place (md/media_posts.md §5). The close button only hides
// the card -- the upload carries on and its outcome still toasts.
export function UploadProgressBar() {
  const insets = useSafeAreaInsets();
  const { queue } = useToast();
  const { uploads, retry, hide, cancel } = useUploadQueue();
  const visible = uploads.filter((u) => !u.hidden);
  if (visible.length === 0 || queue.length > 0) return null;

  return (
    <View style={[styles.overlay, { top: insets.top + 12 }]} pointerEvents="box-none">
      {visible.map((item) => {
        const failed = item.state === "failed";
        const variant = failed ? "danger" : "info";
        const fill = item.state === "moderating" ? 1 : item.progress;
        return (
          <View key={item.postId} style={[styles.card, { borderLeftColor: VARIANT_COLOR[variant] }]}>
            <View style={styles.row}>
              <Ionicons
                name={failed ? VARIANT_ICON.danger : "cloud-upload-outline"}
                size={20}
                color={VARIANT_COLOR[variant]}
              />
              <View style={styles.textColumn}>
                <Text style={styles.label}>{failed ? "Upload failed" : "Posting"}</Text>
                <Text style={styles.message}>{message(item)}</Text>
                {!failed && (
                  <Text style={styles.hint}>{"We'll let you know when it's done."}</Text>
                )}
                {failed ? (
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => retry(item.postId)} hitSlop={8}>
                      <Text style={styles.action}>RETRY</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => cancel(item.postId)} hitSlop={8}>
                      <Text style={styles.actionMuted}>DISMISS</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          { backgroundColor: VARIANT_COLOR[variant], width: `${Math.round(fill * 100)}%` },
                        ]}
                      />
                    </View>
                    {/* Once the file is up, the post is with moderation (and
                        may already be live), so there's nothing to cancel --
                        delete it from the profile instead. */}
                    {item.state === "uploading" && item.progress < 1 && (
                      <View style={styles.actions}>
                        <TouchableOpacity
                          onPress={() => cancel(item.postId)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Cancel upload"
                        >
                          <Text style={styles.actionMuted}>CANCEL</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </View>
              {!failed && (
                <TouchableOpacity
                  onPress={() => hide(item.postId)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Hide upload progress"
                  accessibilityHint="The upload keeps going"
                >
                  <Ionicons name="close" size={18} color={C.muted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
