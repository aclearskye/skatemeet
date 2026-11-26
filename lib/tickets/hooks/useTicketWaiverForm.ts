import { useQuery } from "@tanstack/react-query";
import { fetchTicketWaiverForm } from "@/lib/tickets/waiverQueries";
import { queryKeys } from "@/utils/queryKeys";

// The waiver a skater signs before buying at this store (null: none
// needed), with their own details from their last signed waiver.
export function useTicketWaiverForm(storeOwnerId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.ticketWaiverForm(storeOwnerId),
    queryFn: () => fetchTicketWaiverForm(storeOwnerId),
    enabled,
  });
}
