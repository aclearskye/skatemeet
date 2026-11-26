import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { fetchMyTickets } from "@/lib/tickets/queries";
import { queryKeys } from "@/utils/queryKeys";

// The signed-in skater's bought tickets, newest first.
export function useMyTickets() {
  const { profile } = useAuthContext();
  return useQuery({
    queryKey: queryKeys.myTickets(profile?.profile_id ?? ""),
    queryFn: fetchMyTickets,
    enabled: profile != null && profile.account_type !== "store",
  });
}
