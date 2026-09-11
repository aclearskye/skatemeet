import { fetchBanAppeals } from "@/lib/admin/queries";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

export function useBanAppealsQueue() {
  return useQuery({
    queryKey: queryKeys.adminBanAppeals(),
    queryFn: fetchBanAppeals,
  });
}
