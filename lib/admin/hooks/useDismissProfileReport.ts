import { dismissProfileReport } from "@/lib/admin/mutations";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDismissProfileReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: string) => dismissProfileReport(profileId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminProfileReports() });
    },
  });
}
