import { fetchMessageReports } from "@/lib/admin/messageReportQueries";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

export function useMessageReportsQueue() {
  return useQuery({
    queryKey: queryKeys.adminMessageReports(),
    queryFn: fetchMessageReports,
  });
}
