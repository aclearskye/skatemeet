import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { hostedPageReturnUrl, openHostedPage } from "@/lib/shared/openHostedPage";
import { createTicketCheckout } from "@/lib/tickets/mutations";
import type { WaiverSignature } from "@/lib/tickets/waiverTypes";
import { queryKeys } from "@/utils/queryKeys";

// waiver: the store's waiver, signed in the app; null when it has none.
type BuyTicketVars = { ticketTypeId: string; waiver: WaiverSignature | null };

// The ticket turns paid when Stripe's webhook lands, usually within a few
// seconds of the buyer coming back.
const REFETCH_DELAYS_MS = [0, 2000, 5000, 10000];

// Pays for one ticket on a Stripe Checkout page run on the store's own
// Stripe account (card, Apple Pay or Google Pay; never IAP), then refreshes
// the buyer's tickets.
export function useBuyTicket() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const profileId = profile?.profile_id ?? "";

  return useMutation({
    mutationFn: async ({ ticketTypeId, waiver }: BuyTicketVars) => {
      const returnUrl = hostedPageReturnUrl();
      const url = await createTicketCheckout(ticketTypeId, returnUrl, waiver);
      await openHostedPage(url, returnUrl);
    },
    onSettled: () => {
      for (const delay of REFETCH_DELAYS_MS) {
        setTimeout(() => queryClient.invalidateQueries({ queryKey: queryKeys.myTickets(profileId) }), delay);
      }
    },
  });
}
