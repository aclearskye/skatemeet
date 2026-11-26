import { useQuery } from "@tanstack/react-query";
import { fetchSwapOptions } from "@/lib/tickets/requestQueries";
import { queryKeys } from "@/utils/queryKeys";

// What an unused ticket could be swapped for. ticketId null: not asked yet.
export function useSwapOptions(ticketId: string | null) {
  return useQuery({
    queryKey: queryKeys.ticketSwapOptions(ticketId ?? ""),
    queryFn: () => fetchSwapOptions(ticketId!),
    enabled: ticketId != null,
  });
}
