import { useState } from "react";
import { ActivityIndicator, Image, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "@/lib/shared/keyboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useUploadQueue } from "@/lib/context/upload-queue-context";
import type { EntityTagOption } from "@/lib/posts/entityTagOptions";
import { PostError } from "@/lib/posts/errors";
import { capturePostPhoto, CROP_ASPECTS, pickPostPhotos, preparePhoto, type CropAspect, type PickedPhoto } from "@/lib/posts/preparePhoto";
import { pickPostVideo, recordPostVideo, type PickedVideo } from "@/lib/posts/prepareVideo";
import { MAX_CAPTION_LENGTH, MAX_PHOTOS_PER_POST, MAX_VIDEO_SECONDS } from "@/lib/posts/types";
import { C } from "@/lib/theme";
import { EntityTagPicker } from "@/components/posts/EntityTagPicker";
import { SkaterTagPicker, type TaggedSkater } from "@/components/posts/SkaterTagPicker";
import { PostVideo } from "@/components/posts/PostVideo";
import { styles } from "./PostComposer.styles";

type Props = {
  onClose: () => void;
};

// 1–10 photos or one video, never both (md/media_posts.md §1, §5). Photos
// are cropped + re-encoded on the device (stripping EXIF/GPS); a video goes
// to Cloudflare Stream as-is, where transcoding drops its metadata. Either
// way the upload queue takes over in the background.

function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export function PostComposer({ onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { startPhotoPost, startVideoPost } = useUploadQueue();
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [aspect, setAspect] = useState<CropAspect>("original");
  const [caption, setCaption] = useState("");
  const [entity, setEntity] = useState<EntityTagOption | null>(null);
  const [skaters, setSkaters] = useState<TaggedSkater[]>([]);
  const [isEntityPickerOpen, setIsEntityPickerOpen] = useState(false);
  const [isSkaterPickerOpen, setIsSkaterPickerOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFull = photos.length >= MAX_PHOTOS_PER_POST;
  const hasMedia = photos.length > 0 || video != null;
  const activeRatio = CROP_ASPECTS.find((a) => a.key === aspect)?.ratio ?? null;

  async function handlePick() {
    const picked = await pickPostPhotos(photos.length);
    if (picked.length) setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS_PER_POST));
  }

  async function handleCapture() {
    const shot = await capturePostPhoto();
    if (shot) setPhotos((prev) => [...prev, shot].slice(0, MAX_PHOTOS_PER_POST));
  }

  async function handleVideo(source: "library" | "camera") {
    setError(null);
    try {
      const picked = source === "library" ? await pickPostVideo() : await recordPostVideo();
      if (picked) setVideo(picked);
    } catch (e) {
      setError(e instanceof PostError ? e.message : "Couldn't use that video — try another.");
    }
  }

  async function handlePost() {
    if (!hasMedia || isPosting) return;
    setError(null);
    setIsPosting(true);
    try {
      const details = { caption, entityTag: entity?.tag ?? null, taggedProfileIds: skaters.map((s) => s.profileId) };
      if (video) {
        await startVideoPost(details, video);
      } else {
        const prepared = await Promise.all(photos.map((p) => preparePhoto(p, aspect)));
        await startPhotoPost(details, prepared);
      }
      onClose();
    } catch (e) {
      setError(e instanceof PostError ? e.message : "Couldn't start your post — try again.");
      setIsPosting(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Cancel">
          <Ionicons name="close" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title}>NEW POST</Text>
        <TouchableOpacity
          style={[styles.postBtn, (!hasMedia || isPosting) && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={!hasMedia || isPosting}
          activeOpacity={0.85}
        >
          {isPosting ? <ActivityIndicator color={C.onPrimary} size="small" /> : <Text style={styles.postText}>POST</Text>}
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Keeps the caption field above the keyboard on both platforms. */}
      <KeyboardAwareScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {photos.map((p, i) => (
            <View key={`${p.uri}-${i}`} style={[styles.thumb, activeRatio ? { aspectRatio: activeRatio } : null]}>
              <Image source={{ uri: p.uri }} style={styles.thumbImage} resizeMode="cover" />
              <TouchableOpacity
                style={styles.thumbRemove}
                onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                hitSlop={8}
                accessibilityLabel="Remove photo"
              >
                <Ionicons name="close" size={14} color={C.text} />
              </TouchableOpacity>
            </View>
          ))}
          {video && (
            <View style={[styles.thumb, styles.videoThumb]}>
              <PostVideo uri={video.uri} isActive isMuted contentFit="cover" />
              {video.durationSeconds != null && (
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{formatDuration(video.durationSeconds)}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.thumbRemove}
                onPress={() => setVideo(null)}
                hitSlop={8}
                accessibilityLabel="Remove video"
              >
                <Ionicons name="close" size={14} color={C.text} />
              </TouchableOpacity>
            </View>
          )}
          {!video && !isFull && (
            <View style={styles.addColumn}>
              <TouchableOpacity style={styles.addBtn} onPress={handlePick} activeOpacity={0.75}>
                <Ionicons name="images-outline" size={22} color={C.primary} />
                <Text style={styles.addText}>LIBRARY</Text>
              </TouchableOpacity>
              {Platform.OS !== "web" && (
                <TouchableOpacity style={styles.addBtn} onPress={handleCapture} activeOpacity={0.75}>
                  <Ionicons name="camera-outline" size={22} color={C.primary} />
                  <Text style={styles.addText}>CAMERA</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {/* A post is photos or one video, so video only offers while empty. */}
          {!hasMedia && (
            <View style={styles.addColumn}>
              <TouchableOpacity style={styles.addBtn} onPress={() => handleVideo("library")} activeOpacity={0.75}>
                <Ionicons name="film-outline" size={22} color={C.primary} />
                <Text style={styles.addText}>VIDEO</Text>
              </TouchableOpacity>
              {Platform.OS !== "web" && (
                <TouchableOpacity style={styles.addBtn} onPress={() => handleVideo("camera")} activeOpacity={0.75}>
                  <Ionicons name="videocam-outline" size={22} color={C.primary} />
                  <Text style={styles.addText}>RECORD</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
        <Text style={styles.hint}>
          {video
            ? `1 VIDEO · UP TO ${MAX_VIDEO_SECONDS}S`
            : `${photos.length}/${MAX_PHOTOS_PER_POST} PHOTOS · OR 1 VIDEO UP TO ${MAX_VIDEO_SECONDS}S`}
        </Text>

        {!video && (
          <>
            <Text style={styles.label}>CROP</Text>
            <View style={styles.aspectRow}>
              {CROP_ASPECTS.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  style={[styles.aspectBtn, aspect === a.key && styles.aspectBtnActive]}
                  onPress={() => setAspect(a.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.aspectText, aspect === a.key && styles.aspectTextActive]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>CAPTION</Text>
        <TextInput
          style={styles.caption}
          placeholder="Say something about it"
          placeholderTextColor={C.muted}
          value={caption}
          onChangeText={setCaption}
          maxLength={MAX_CAPTION_LENGTH}
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.tagRow} onPress={() => setIsEntityPickerOpen(true)} activeOpacity={0.75}>
          <Ionicons name="location-outline" size={18} color={C.primary} />
          <Text style={styles.tagText} numberOfLines={1}>
            {entity ? `${entity.kindLabel} · ${entity.name}` : "TAG A SPOT, DIY OR STORE"}
          </Text>
          {entity ? (
            <TouchableOpacity onPress={() => setEntity(null)} hitSlop={10} accessibilityLabel="Remove spot tag">
              <Ionicons name="close" size={16} color={C.muted} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={16} color={C.muted} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tagRow} onPress={() => setIsSkaterPickerOpen(true)} activeOpacity={0.75}>
          <Ionicons name="people-outline" size={18} color={C.primary} />
          <Text style={styles.tagText} numberOfLines={1}>
            {skaters.length ? skaters.map((s) => `@${s.username}`).join(", ") : "TAG SKATERS"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={C.muted} />
        </TouchableOpacity>
        <Text style={styles.hint}>TAGGED SKATERS ARE ASKED TO ACCEPT BEFORE THEY SHOW ON THE POST.</Text>
      </KeyboardAwareScrollView>

      <EntityTagPicker
        visible={isEntityPickerOpen}
        onSelect={(option) => {
          setEntity(option);
          setIsEntityPickerOpen(false);
        }}
        onClose={() => setIsEntityPickerOpen(false)}
      />
      <SkaterTagPicker
        visible={isSkaterPickerOpen}
        selected={skaters}
        onChange={setSkaters}
        onClose={() => setIsSkaterPickerOpen(false)}
      />
    </View>
  );
}
