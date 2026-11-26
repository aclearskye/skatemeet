import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { hostedPageReturnUrl, openHostedPage } from "@/lib/shared/openHostedPage";
import { createTicketingOnboardingLink, refreshTicketingAccount } from "@/lib/tickets/mutations";
import { queryKeys } from "@/utils/queryKeys";

// Stripe's account.updated webhook can lag the store coming back, so the
// account is re-read directly and then refetched a few times.
const REFETCH_DELAYS_MS = [2000, 5000, 10000];

// Opens Stripe's hosted onboarding for the store's own Stripe account (it
// creates the account on first use), then refreshes the ticketing status.
export function useTicketingOnboarding() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const profileId = profile?.profile_id ?? "";
  const refetch = () => queryClient.invalidateQueries({ queryKey: queryKeys.myTicketing(profileId) });

  return useMutation({
    mutationFn: async () => {
      const returnUrl = hostedPageReturnUrl();
      const url = await createTicketingOnboardingLink(returnUrl);
      await openHostedPage(url, returnUrl);
      await refreshTicketingAccount();
    },
    onSettled: () => {
      refetch();
      for (const delay of REFETCH_DELAYS_MS) setTimeout(refetch, delay);
    },
  });
}
