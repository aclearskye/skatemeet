import { useQuery } from "@tanstack/react-query";
import { fetchSpotChatReports } from "@/lib/admin/spotChatReportQueries";
import { queryKeys } from "@/utils/queryKeys";

export function useSpotChatReportsQueue() {
  return useQuery({
    queryKey: queryKeys.adminSpotChatReports(),
    queryFn: fetchSpotChatReports,
  });
}
