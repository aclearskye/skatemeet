import { fetchVerificationQueue } from "@/lib/admin/queries";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

export function useVerificationQueue() {
  return useQuery({
    queryKey: queryKeys.adminVerificationQueue(),
    queryFn: fetchVerificationQueue,
  });
}
