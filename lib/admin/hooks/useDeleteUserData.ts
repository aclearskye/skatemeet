import { deleteUserData } from "@/lib/admin/mutations";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteUserData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: string) => deleteUserData(profileId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminDeletionEligible() });
    },
  });
}
