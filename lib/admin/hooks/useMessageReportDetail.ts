import { openMessageReport } from "@/lib/admin/messageReportQueries";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

// Only runs once the admin chooses to open the report, since every fetch
// is written to the audit log.
export function useMessageReportDetail(reportId: string, isOpen: boolean) {
  return useQuery({
    queryKey: queryKeys.adminMessageReportDetail(reportId),
    queryFn: () => openMessageReport(reportId),
    enabled: isOpen,
    staleTime: Infinity,
  });
}
