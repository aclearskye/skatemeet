import { useQuery } from "@tanstack/react-query";
import { fetchStoreTickets } from "@/lib/tickets/queries";
import { queryKeys } from "@/utils/queryKeys";

// The tickets a store has on sale, and which this viewer can buy.
export function useStoreTickets(storeOwnerId: string | null) {
  return useQuery({
    queryKey: queryKeys.storeTickets(storeOwnerId ?? ""),
    queryFn: () => fetchStoreTickets(storeOwnerId!),
    enabled: storeOwnerId != null,
  });
}
