import { useAuthContext } from "@/lib/context/use-auth-context";
import { reportProfile } from "@/lib/profiles/mutations";
import { hasReportedProfile } from "@/lib/profiles/queries";
import type { ProfileReportReason } from "@/lib/shared/types";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useReportProfile(profileId: string) {
  const { session } = useAuthContext();
  const reporterId = session?.user.id ?? null;
  const queryClient = useQueryClient();

  const { data: hasReported = false } = useQuery({
    queryKey: queryKeys.profileReportStatus(profileId),
    queryFn: () => hasReportedProfile(profileId, reporterId!),
    enabled: reporterId != null,
  });

  const mutation = useMutation({
    mutationFn: (reason: ProfileReportReason) => reportProfile(profileId, reason),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.profileReportStatus(profileId), true);
    },
  });

  return {
    hasReported,
    report: mutation.mutate,
    isReporting: mutation.isPending,
  };
}
