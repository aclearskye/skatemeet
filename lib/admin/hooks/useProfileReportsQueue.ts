import { fetchProfileReports } from "@/lib/admin/queries";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

export function useProfileReportsQueue() {
  return useQuery({
    queryKey: queryKeys.adminProfileReports(),
    queryFn: fetchProfileReports,
  });
}
