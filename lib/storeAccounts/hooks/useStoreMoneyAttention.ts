import { useMyTicketing } from "@/lib/tickets/hooks/useMyTicketing";
import { useStoreBilling } from "@/lib/storeAccounts/hooks/useStoreBilling";

// Whether something on the Money tab needs the owner: the subscription
// isn't paid or has no card, or Stripe setup for tickets was started but
// not finished, or skaters are waiting on refund or swap requests. Drives
// the dot on the tab.
export function useStoreMoneyAttention(): boolean {
  const { data: billing } = useStoreBilling();
  const { data: ticketing } = useMyTicketing();

  const billingNeedsAttention =
    billing != null && (!billing.isPaid || (!billing.paymentMethodReady && !billing.hasSubscription));
  const ticketingUnfinished = ticketing != null && !ticketing.chargesEnabled && !ticketing.detailsSubmitted;
  const requestsWaiting = (ticketing?.pendingRequests ?? 0) > 0;
  return billingNeedsAttention || ticketingUnfinished || requestsWaiting;
}
