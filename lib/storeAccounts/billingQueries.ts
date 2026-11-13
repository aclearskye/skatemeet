import { supabase } from "@/lib/supabaseClient";
import { toStoreAccountError, type StoreBilling, type StoreSubscriptionStatus } from "./types";

type BillingRow = {
  payment_method_ready: boolean;
  status: StoreSubscriptionStatus | null;
  has_subscription: boolean;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  is_approved: boolean;
  is_paid: boolean;
};

export async function fetchMyStoreBilling(): Promise<StoreBilling> {
  const { data, error } = await supabase.rpc("get_my_store_billing");
  if (error) throw toStoreAccountError(error);
  const row = data as BillingRow;
  return {
    paymentMethodReady: row.payment_method_ready,
    status: row.status,
    hasSubscription: row.has_subscription,
    trialEnd: row.trial_end,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    isApproved: row.is_approved,
    isPaid: row.is_paid,
  };
}
