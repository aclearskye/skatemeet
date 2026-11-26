import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { isApprovedStoreProfile } from "@/lib/storeAccounts/types";
import { refreshTicketingAccount } from "@/lib/tickets/mutations";
import { fetchMyTicketing } from "@/lib/tickets/queries";
import type { MyTicketing } from "@/lib/tickets/types";
import { queryKeys } from "@/utils/queryKeys";

// Reads the status, and while Stripe setup is unfinished asks Stripe for
// the latest first. Coming back from Stripe (on web the page reloads)
// then shows the result straight away instead of waiting for the
// account.updated webhook.
async function fetchFreshTicketing(): Promise<MyTicketing | null> {
  const ticketing = await fetchMyTicketing();
  if (!ticketing || ticketing.chargesEnabled) return ticketing;
  try {
    await refreshTicketingAccount();
  } catch {
    // Unpaid or offline: show what's stored.
    return ticketing;
  }
  return fetchMyTicketing();
}

// The approved store's Stripe account for selling tickets. Null until it
// starts Stripe onboarding.
export function useMyTicketing() {
  const { profile } = useAuthContext();
  return useQuery({
    queryKey: queryKeys.myTicketing(profile?.profile_id ?? ""),
    queryFn: fetchFreshTicketing,
    enabled: isApprovedStoreProfile(profile),
  });
}
