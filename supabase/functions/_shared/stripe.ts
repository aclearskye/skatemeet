import Stripe from "npm:stripe@17.7.0";

// One Stripe client for the billing functions. Deno has no Node http, so
// it uses fetch, and webhook signatures are checked with SubtleCrypto.
export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2025-02-24.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

export const cryptoProvider = Stripe.createSubtleCryptoProvider();

export type StripeSubscription = Stripe.Subscription;

const toIso = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000).toISOString() : null);

// The store_billing columns that mirror a Stripe subscription.
export function subscriptionColumns(sub: Stripe.Subscription) {
  return {
    stripe_subscription_id: sub.id,
    status: sub.status,
    trial_end: toIso(sub.trial_end),
    current_period_end: toIso(sub.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };
}
