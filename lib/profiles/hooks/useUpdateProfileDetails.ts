import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useToast } from "@/lib/context/toast-context";
import { updateProfileDetails, type ProfileDetailsPatch } from "@/lib/profiles/mutations";
import { queryKeys } from "@/utils/queryKeys";

// Saves the signed-in skater's skate name and profile labels (skill level,
// disciplines, custom tape labels) from the profile's pencil.
export function useUpdateProfileDetails() {
  const { profile, refreshProfile } = useAuthContext();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (patch: ProfileDetailsPatch) => updateProfileDetails(profile!.profile_id, patch),
    onSuccess: () => showToast({ message: "PROFILE UPDATED", variant: "success" }),
    onError: () => showToast({ message: "COULDN'T SAVE YOUR PROFILE — TRY AGAIN", variant: "danger" }),
    onSettled: async () => {
      await refreshProfile();
      if (!profile) return;
      // Other places that show this skater (search, friends) refetch.
      queryClient.invalidateQueries({ queryKey: queryKeys.profileCard(profile.profile_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(profile.profile_id) });
    },
  });

  return { updateProfileDetails: mutation.mutateAsync, isUpdating: mutation.isPending };
}
