import { useQuery } from "@tanstack/react-query";
import { attachPeople, fetchArchivedPosts, fetchEntityPosts, fetchSavedPosts, fetchTaggedPosts, type PostWithPeople } from "@/lib/posts/listQueries";
import { fetchProfilePosts } from "@/lib/posts/queries";
import { entityTagFromFocus } from "@/lib/posts/entityTagOptions";
import { queryKeys } from "@/utils/queryKeys";

// Every grid of posts the app shows, addressed by one serialisable source so
// a grid and the full-screen viewer it opens (app/post/browse.tsx) share a
// cache entry:
//   posts:<profileId> · tagged:<profileId> · saved:<profileId>
//   archived:<profileId> · entity:<map focus key, e.g. spot:<id>>
export type PostListSource = `${"posts" | "tagged" | "saved" | "archived" | "entity"}:${string}`;

function parse(source: PostListSource): { kind: string; id: string } {
  const [kind, ...rest] = source.split(":");
  return { kind, id: rest.join(":") };
}

function keyFor(source: PostListSource) {
  const { kind, id } = parse(source);
  switch (kind) {
    case "posts":
      return queryKeys.profilePosts(id);
    case "tagged":
      return queryKeys.taggedPosts(id);
    case "saved":
      return queryKeys.savedPosts(id);
    case "archived":
      return queryKeys.archivedPosts(id);
    default:
      return queryKeys.entityPosts(id);
  }
}

async function fetchFor(source: PostListSource): Promise<PostWithPeople[]> {
  const { kind, id } = parse(source);
  switch (kind) {
    case "posts":
      return attachPeople(await fetchProfilePosts(id));
    case "tagged":
      return fetchTaggedPosts(id);
    case "saved":
      return fetchSavedPosts(id);
    case "archived":
      return fetchArchivedPosts(id);
    default: {
      const tag = entityTagFromFocus(id);
      return tag ? fetchEntityPosts(tag) : [];
    }
  }
}

export function usePostList(source: PostListSource | null) {
  return useQuery({
    queryKey: source ? keyFor(source) : ["posts", "none"],
    queryFn: () => fetchFor(source!),
    enabled: source != null,
  });
}
