import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { ensureStoreSubscription } from "@/lib/storeAccounts/billingMutations";
import type { StoreBilling } from "@/lib/storeAccounts/types";
import { queryKeys } from "@/utils/queryKeys";

// The fallback for the admin's post-approval call: an approved store with a
// saved card but no subscription starts it itself, once per mount.
export function useEnsureStoreSubscription(billing: StoreBilling | undefined) {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const attempted = useRef(false);
  const needsSubscription = !!billing && billing.isApproved && billing.paymentMethodReady && !billing.hasSubscription;

  useEffect(() => {
    if (!needsSubscription || attempted.current) return;
    attempted.current = true;
    ensureStoreSubscription()
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.storeBilling(profile?.profile_id ?? "") }))
      .catch(() => {});
  }, [needsSubscription, queryClient, profile?.profile_id]);
}
