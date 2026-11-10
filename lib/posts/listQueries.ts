import { supabase } from "@/lib/supabaseClient";
import { POST_SELECT, mapPostRow, type PostRow } from "./queries";
import { entityTagToColumns, type Post, type PostEntityTag } from "./types";

export type PostPerson = {
  profileId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

// A post plus who posted it and who's (accepted-)tagged -- what the viewer
// renders. Works logged out too (get_post_people is anon-callable).
// pendingSkaters is only ever filled for the viewer's own posts.
export type PostWithPeople = Post & { author: PostPerson | null; taggedSkaters: PostPerson[]; pendingSkaters: PostPerson[] };

type PersonRow = {
  post_id: string;
  role: "author" | "tag" | "pending_tag";
  profile_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export async function attachPeople(posts: Post[]): Promise<PostWithPeople[]> {
  if (posts.length === 0) return [];
  const { data, error } = await supabase.rpc("get_post_people", { p_post_ids: posts.map((p) => p.postId) });
  if (error) throw error;
  const rows = data as PersonRow[];
  return posts.map((post) => {
    const mine = rows.filter((r) => r.post_id === post.postId);
    const toPerson = (r: PersonRow): PostPerson => ({
      profileId: r.profile_id,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
    });
    const authorRow = mine.find((r) => r.role === "author");
    return {
      ...post,
      author: authorRow ? toPerson(authorRow) : null,
      taggedSkaters: mine.filter((r) => r.role === "tag").map(toPerson),
      pendingSkaters: mine.filter((r) => r.role === "pending_tag").map(toPerson),
    };
  });
}

// Keeps the caller's order (feed rank, grid order); ids RLS hides drop out.
export async function fetchPostsByIds(postIds: string[]): Promise<PostWithPeople[]> {
  if (postIds.length === 0) return [];
  const { data, error } = await supabase.from("posts").select(POST_SELECT).in("post_id", postIds);
  if (error) throw error;
  const byId = new Map((data as unknown as PostRow[]).map((r) => [r.post_id, mapPostRow(r)]));
  return attachPeople(postIds.map((id) => byId.get(id)).filter((p): p is Post => p != null));
}

// Tagged in: published posts where this skater accepted a tag.
export async function fetchTaggedPosts(profileId: string): Promise<PostWithPeople[]> {
  const { data, error } = await supabase
    .from("post_skater_tags")
    .select("post_id, responded_at")
    .eq("tagged_profile_id", profileId)
    .eq("status", "accepted")
    .order("responded_at", { ascending: false });
  if (error) throw error;
  return fetchPostsByIds((data as { post_id: string }[]).map((r) => r.post_id)).then((posts) =>
    posts.filter((p) => p.status === "published" && !p.archivedAt)
  );
}

// Saved is private to its owner (post_saves RLS: own rows only).
export async function fetchSavedPosts(profileId: string): Promise<PostWithPeople[]> {
  const { data, error } = await supabase
    .from("post_saves")
    .select("post_id, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return fetchPostsByIds((data as { post_id: string }[]).map((r) => r.post_id));
}

export async function fetchArchivedPosts(profileId: string): Promise<PostWithPeople[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("profile_id", profileId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });
  if (error) throw error;
  return attachPeople((data as unknown as PostRow[]).map(mapPostRow));
}

// Spot / store detail grid: only authors who've checked in there.
export async function fetchEntityPosts(tag: PostEntityTag): Promise<PostWithPeople[]> {
  const { data, error } = await supabase.rpc("entity_posts", { ...entityTagToColumns(tag), p_limit: 60 });
  if (error) throw error;
  return fetchPostsByIds((data as { post_id: string }[]).map((r) => r.post_id));
}

export async function fetchLikedPostIds(viewerId: string, postIds: string[]): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("profile_id", viewerId)
    .in("post_id", postIds);
  if (error) throw error;
  return new Set((data as { post_id: string }[]).map((r) => r.post_id));
}

export async function fetchSavedPostIds(viewerId: string, postIds: string[]): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("post_saves")
    .select("post_id")
    .eq("profile_id", viewerId)
    .in("post_id", postIds);
  if (error) throw error;
  return new Set((data as { post_id: string }[]).map((r) => r.post_id));
}
