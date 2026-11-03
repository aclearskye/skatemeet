import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { respondToFriendRequest } from "../mutations";
import type { FriendStatusResult } from "../types";

type RespondVars = {
  requestId: string;
  accept: boolean;
  // The requester, when the caller knows it (the profile page, or a
  // notification's relatedProfileId). Lets an accept update their friend
  // count and the friend icon immediately instead of after a refetch.
  otherProfileId?: string | null;
};

export function useRespondToFriendRequest() {
  const { session } = useAuthContext();
  const profileId = session?.user.id ?? null;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    // The related notification is marked read server-side as part of
    // respond_to_friend_request itself (see the migration comment), so this
    // can be called identically from the notifications inbox or directly
    // from the requester's profile page (AddFriendButton) without knowing
    // the notification's id.
    mutationFn: ({ requestId, accept }: RespondVars) => respondToFriendRequest(requestId, accept),
    onMutate: async ({ accept, otherProfileId }) => {
      if (!accept || !profileId || !otherProfileId) return;
      const statusKey = queryKeys.friendStatus(profileId, otherProfileId);
      const countKeys = [queryKeys.friendCount(profileId), queryKeys.friendCount(otherProfileId)];
      await Promise.all(
        [statusKey, ...countKeys].map((queryKey) => queryClient.cancelQueries({ queryKey }))
      );

      const previousStatus = queryClient.getQueryData<FriendStatusResult>(statusKey);
      const previousCounts = countKeys.map((key) => queryClient.getQueryData<number>(key));

      queryClient.setQueryData<FriendStatusResult>(statusKey, (old) => ({
        status: "friends",
        requestId: old?.requestId ?? null,
      }));
      // Only bump counts already cached -- an uncached one is fetched fresh
      // (and correct) whenever its profile is next shown.
      countKeys.forEach((key) => {
        queryClient.setQueryData<number>(key, (old) => (old === undefined ? old : old + 1));
      });

      return { statusKey, previousStatus, countKeys, previousCounts };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      queryClient.setQueryData(context.statusKey, context.previousStatus);
      context.countKeys.forEach((key, i) => queryClient.setQueryData(key, context.previousCounts[i]));
    },
    onSettled: (_data, _err, { otherProfileId }) => {
      if (!profileId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(profileId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount(profileId) });
      // Prefix match: invalidates every friendStatus(profileId, *) entry,
      // since a response doesn't by itself say which profile was on the
      // other end of the request.
      queryClient.invalidateQueries({ queryKey: ["profile", profileId, "friendStatus"] });
      // An accept adds a friend, changing both sides' counts and the
      // viewer's list.
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStats(profileId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendsList(profileId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatList(profileId) });
      if (otherProfileId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profileStats(otherProfileId) });
        // Accepting a private skater makes their full profile readable.
        queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(otherProfileId) });
      }
    },
  });

  return {
    respond: mutation.mutate,
    isResponding: mutation.isPending,
  };
}
