import { fetchCsamHolds } from "@/lib/admin/postModerationQueries";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

export function useCsamHolds() {
  return useQuery({
    queryKey: queryKeys.adminCsamHolds(),
    queryFn: fetchCsamHolds,
  });
}
