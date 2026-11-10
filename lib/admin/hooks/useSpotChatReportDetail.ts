import { useQuery } from "@tanstack/react-query";
import { openSpotChatReport } from "@/lib/admin/spotChatReportQueries";
import { queryKeys } from "@/utils/queryKeys";

// Only runs once the admin chooses to open the report, since every fetch
// is written to the audit log.
export function useSpotChatReportDetail(reportId: string, isOpen: boolean) {
  return useQuery({
    queryKey: queryKeys.adminSpotChatReportDetail(reportId),
    queryFn: () => openSpotChatReport(reportId),
    enabled: isOpen,
    staleTime: Infinity,
  });
}
