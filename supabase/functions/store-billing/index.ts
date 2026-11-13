import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { stripe, subscriptionColumns } from "../_shared/stripe.ts";

// Store account billing (docs/ACCOUNT_TYPES.md, "Store", Billing). Called by
// the app with the user's JWT. Every Stripe page is Stripe-hosted, so card
// details never touch SkateMeet.
//
//   setup_card          Store saves a card (Checkout, setup mode). Onboarding.
//   ensure_subscription Creates the subscription once the claim is approved,
//                       with the trial ending 14 days after approval. Called
//                       by the admin right after approving and by the store
//                       app as a fallback; safe to call repeatedly.
//   portal              Stripe Billing Portal: change card, pay an unpaid
//                       invoice (which reactivates the subscription), cancel.
//   resubscribe         A canceled store starts a new subscription
//                       (Checkout, subscription mode, no trial).
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, BILLING_RETURN_PREFIXES
// (comma-separated, e.g. "https://skatemeet.app/,skatemeet://").

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRIAL_DAYS = 14;
// Stripe needs a trial to end at least this far in the future.
const MIN_TRIAL_SECONDS = 60 * 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

class BillingError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

// Return URLs come from the client, so only known app and site prefixes are
// accepted (otherwise this would be an open redirect via Stripe).
function checkReturnUrl(url: unknown): string {
  const prefixes = (Deno.env.get("BILLING_RETURN_PREFIXES") ?? "skatemeet://")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (typeof url !== "string" || !prefixes.some((p) => url.startsWith(p))) {
    throw new BillingError("INVALID_RETURN_URL");
  }
  return url;
}

type BillingRow = {
  profile_id: string;
  stripe_customer_id: string;
  payment_method_ready: boolean;
  stripe_subscription_id: string | null;
  status: string | null;
};

async function getBilling(admin: SupabaseClient, profileId: string): Promise<BillingRow | null> {
  const { data, error } = await admin.from("store_billing").select("*").eq("profile_id", profileId).maybeSingle();
  if (error) throw error;
  return data as BillingRow | null;
}

async function ensureCustomer(admin: SupabaseClient, profileId: string, email: string | undefined): Promise<string> {
  const existing = await getBilling(admin, profileId);
  if (existing) return existing.stripe_customer_id;

  const customer = await stripe.customers.create(
    { email, metadata: { profile_id: profileId } },
    // Two quick taps must not make two customers.
    { idempotencyKey: `customer-${profileId}` }
  );
  const { error } = await admin
    .from("store_billing")
    .upsert({ profile_id: profileId, stripe_customer_id: customer.id }, { onConflict: "profile_id", ignoreDuplicates: true });
  if (error) throw error;
  return (await getBilling(admin, profileId))!.stripe_customer_id;
}

async function ensureSubscription(admin: SupabaseClient, profileId: string) {
  const { data: claim, error } = await admin
    .from("store_claims")
    .select("claim_id, reviewed_at")
    .eq("profile_id", profileId)
    .eq("status", "approved")
    .maybeSingle();
  if (error) throw error;
  if (!claim?.reviewed_at) throw new BillingError("STORE_NOT_APPROVED");

  const billing = await getBilling(admin, profileId);
  if (!billing?.payment_method_ready) throw new BillingError("BILLING_REQUIRED");
  // Anything but a dead subscription means there's nothing to do. A
  // canceled store resubscribes itself (resubscribe), with no new trial.
  if (billing.stripe_subscription_id && billing.status !== "incomplete_expired") {
    return { created: false };
  }

  const approvedAt = Math.floor(new Date(claim.reviewed_at).getTime() / 1000);
  const trialEnd = approvedAt + TRIAL_DAYS * 24 * 60 * 60;
  const now = Math.floor(Date.now() / 1000);

  const sub = await stripe.subscriptions.create(
    {
      customer: billing.stripe_customer_id,
      items: [{ price: Deno.env.get("STRIPE_PRICE_ID")! }],
      // Past the window (it took the store over 14 days to add a card after
      // approval): bill now.
      ...(trialEnd - now > MIN_TRIAL_SECONDS ? { trial_end: trialEnd } : {}),
      metadata: { profile_id: profileId },
      payment_settings: { save_default_payment_method: "on_subscription" },
    },
    { idempotencyKey: `subscription-${profileId}-${claim.claim_id}` }
  );

  const { error: saveError } = await admin
    .from("store_billing")
    .update(subscriptionColumns(sub))
    .eq("profile_id", profileId);
  if (saveError) throw saveError;
  return { created: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "NOT_AUTHENTICATED" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: userData, error: userError } = await caller.auth.getUser();
    if (userError || !userData.user) return json({ error: "NOT_AUTHENTICATED" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    const { data: profile } = await admin
      .from("profiles")
      .select("account_type")
      .eq("profile_id", user.id)
      .maybeSingle();
    const isStore = profile?.account_type === "store";

    if (action === "ensure_subscription") {
      // The store itself, or an admin finishing an approval.
      let target = user.id;
      if (typeof body.profileId === "string" && body.profileId !== user.id) {
        const { data: isAdmin } = await caller.rpc("is_admin", { p_profile_id: user.id });
        if (!isAdmin) throw new BillingError("NOT_ADMIN", 403);
        target = body.profileId;
      } else if (!isStore) {
        throw new BillingError("NOT_STORE_ACCOUNT", 403);
      }
      return json(await ensureSubscription(admin, target));
    }

    if (!isStore) throw new BillingError("NOT_STORE_ACCOUNT", 403);
    const { data: activeBan } = await admin
      .from("user_bans")
      .select("profile_id")
      .eq("profile_id", user.id)
      .is("unbanned_at", null)
      .limit(1);
    if (activeBan?.length) throw new BillingError("BANNED", 403);

    if (action === "setup_card") {
      const returnUrl = checkReturnUrl(body.returnUrl);
      const customer = await ensureCustomer(admin, user.id, user.email);
      const session = await stripe.checkout.sessions.create({
        mode: "setup",
        customer,
        payment_method_types: ["card"],
        success_url: returnUrl,
        cancel_url: returnUrl,
        metadata: { profile_id: user.id, purpose: "store_setup_card" },
        // Stripe Managed Payments (on by default for new accounts) only
        // supports payment and subscription mode, and saving a card for a
        // later trial needs setup mode. Not in stripe-node 17's types yet.
        ...({ managed_payments: { enabled: false } } as Record<string, unknown>),
      });
      return json({ url: session.url });
    }

    if (action === "portal") {
      const returnUrl = checkReturnUrl(body.returnUrl);
      const billing = await getBilling(admin, user.id);
      if (!billing) throw new BillingError("BILLING_REQUIRED");
      const session = await stripe.billingPortal.sessions.create({
        customer: billing.stripe_customer_id,
        return_url: returnUrl,
      });
      return json({ url: session.url });
    }

    if (action === "resubscribe") {
      const returnUrl = checkReturnUrl(body.returnUrl);
      const billing = await getBilling(admin, user.id);
      if (!billing) throw new BillingError("BILLING_REQUIRED");
      if (billing.status !== "canceled" && billing.status !== "incomplete_expired") {
        throw new BillingError("SUBSCRIPTION_ACTIVE");
      }
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: billing.stripe_customer_id,
        line_items: [{ price: Deno.env.get("STRIPE_PRICE_ID")!, quantity: 1 }],
        subscription_data: { metadata: { profile_id: user.id } },
        success_url: returnUrl,
        cancel_url: returnUrl,
        metadata: { profile_id: user.id, purpose: "store_resubscribe" },
        // Same billing model as the first subscription (see setup_card).
        ...({ managed_payments: { enabled: false } } as Record<string, unknown>),
      });
      return json({ url: session.url });
    }

    throw new BillingError("UNKNOWN_ACTION");
  } catch (err) {
    if (err instanceof BillingError) return json({ error: err.code }, err.status);
    console.error("store-billing", err);
    return json({ error: "BILLING_UNAVAILABLE" }, 500);
  }
});
