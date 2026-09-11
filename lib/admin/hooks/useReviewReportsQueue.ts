import { fetchReviewReports } from "@/lib/admin/queries";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

export function useReviewReportsQueue() {
  return useQuery({
    queryKey: queryKeys.adminReviewReports(),
    queryFn: fetchReviewReports,
  });
}
