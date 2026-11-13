import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { createBillingSession } from "@/lib/storeAccounts/billingMutations";
import { billingReturnUrl, openStripePage } from "@/lib/storeAccounts/openStripePage";
import type { BillingAction } from "@/lib/storeAccounts/types";
import { queryKeys } from "@/utils/queryKeys";

// Stripe's webhook usually lands within a few seconds of the user coming
// back, so billing is refetched a few times rather than once.
const REFETCH_DELAYS_MS = [0, 2000, 5000, 10000];

// Opens a Stripe-hosted billing page, then refreshes billing (and the page
// editor, since paid/unpaid decides what it can edit).
export function useStoreBillingAction() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const profileId = profile?.profile_id ?? "";

  return useMutation({
    mutationFn: async (action: BillingAction) => {
      const returnUrl = billingReturnUrl();
      const url = await createBillingSession(action, returnUrl);
      await openStripePage(url, returnUrl);
    },
    onSettled: () => {
      for (const delay of REFETCH_DELAYS_MS) {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.storeBilling(profileId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.myStorePage(profileId) });
        }, delay);
      }
    },
  });
}
