import { fetchHeldPosts } from "@/lib/admin/postModerationQueries";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

export function useHeldPostsQueue() {
  return useQuery({
    queryKey: queryKeys.adminHeldPosts(),
    queryFn: fetchHeldPosts,
  });
}
