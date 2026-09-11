import { fetchPhotoReports } from "@/lib/admin/queries";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

export function usePhotoReportsQueue() {
  return useQuery({
    queryKey: queryKeys.adminPhotoReports(),
    queryFn: fetchPhotoReports,
  });
}
