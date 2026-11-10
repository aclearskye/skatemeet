import { supabase } from "@/lib/supabaseClient";
import { toPostError } from "./errors";
import { entityTagToColumns, type PostEntityTag, type PostMediaType, type PostReportReason } from "./types";

export type CreatePostDraftInput = {
  mediaType: PostMediaType;
  mediaCount: number;
  caption: string;
  entityTag: PostEntityTag | null;
  taggedProfileIds: string[];
};

export type PostDraft = {
  postId: string;
  // Exact quarantine paths to upload to, in position order.
  uploadPaths: string[];
};

export async function createPostDraft(input: CreatePostDraftInput): Promise<PostDraft> {
  const { data: postId, error } = await supabase.rpc("create_post_draft", {
    p_media_type: input.mediaType,
    p_media_count: input.mediaCount,
    p_caption: input.caption,
    ...entityTagToColumns(input.entityTag),
    p_tagged_profile_ids: input.taggedProfileIds,
  });
  if (error) throw toPostError(error);

  const { data: media, error: mediaError } = await supabase
    .from("post_media")
    .select("position, storage_path")
    .eq("post_id", postId as string)
    .order("position");
  if (mediaError) throw toPostError(mediaError);

  return {
    postId: postId as string,
    uploadPaths: (media as { storage_path: string | null }[]).map((m) => m.storage_path ?? ""),
  };
}

// Hands the finished upload to moderation. Returns the post's new status.
export async function submitPost(postId: string): Promise<string> {
  const { data, error } = await supabase.rpc("submit_post", { p_post_id: postId });
  if (error) throw toPostError(error);
  return data as string;
}

export type UpdatePostInput = {
  postId: string;
  caption: string;
  entityTag: PostEntityTag | null;
  taggedProfileIds: string[];
};

export async function updatePost(input: UpdatePostInput): Promise<void> {
  const { error } = await supabase.rpc("update_post", {
    p_post_id: input.postId,
    p_caption: input.caption,
    ...entityTagToColumns(input.entityTag),
    p_tagged_profile_ids: input.taggedProfileIds,
  });
  if (error) throw toPostError(error);
}

export async function pinPost(postId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.rpc("pin_post", { p_post_id: postId, p_pinned: pinned });
  if (error) throw toPostError(error);
}

export async function archivePost(postId: string, archived: boolean): Promise<void> {
  const { error } = await supabase.rpc("archive_post", { p_post_id: postId, p_archived: archived });
  if (error) throw toPostError(error);
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_post", { p_post_id: postId });
  if (error) throw toPostError(error);
}

// Returns the new state (true = now liked / saved).
export async function togglePostLike(postId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("toggle_post_like", { p_post_id: postId });
  if (error) throw toPostError(error);
  return data as boolean;
}

export async function togglePostSave(postId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("toggle_post_save", { p_post_id: postId });
  if (error) throw toPostError(error);
  return data as boolean;
}

export async function reportPost(postId: string, reason: PostReportReason): Promise<void> {
  const { error } = await supabase.rpc("report_post", { p_post_id: postId, p_reason: reason });
  if (error) throw toPostError(error);
}

export async function respondToPostTag(postId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc("respond_to_post_tag", { p_post_id: postId, p_accept: accept });
  if (error) throw toPostError(error);
}

export async function removeMyPostTag(postId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_my_post_tag", { p_post_id: postId });
  if (error) throw toPostError(error);
}
