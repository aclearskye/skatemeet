import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAllowedReturnUrl } from "../_shared/returnUrl.ts";
import { stripe } from "../_shared/stripe.ts";
import { stripeV2 } from "../_shared/stripeV2.ts";

// Store tickets (docs/ACCOUNT_TYPES.md, "Store", Tickets). Called by the app
// with the user's JWT. Payments are Stripe Connect direct charges: each
// store has its own Stripe account (full dashboard, like the old Standard
// accounts) and is the merchant of record, so the money never passes
// through SkateMeet. Never IAP (entry to a venue is a service used outside
// the app).
//
//   connect_onboard  Store: creates its Stripe account on first use
//                    (Accounts v2), then returns a Stripe-hosted onboarding
//                    link.
//   connect_refresh  Store: re-reads its Stripe account after onboarding, in
//                    case the account.updated webhook hasn't landed yet.
//   refund_request   Store: approves a skater's refund request (a ticket
//                    unused 30 days after purchase) and refunds it in Stripe.
//   auto_refund      Skater: right after asking, when the store
//                    auto-refunds tickets at that price.
//   checkout         Skater: one ticket (with the store's waiver signed,
//                    when it has one), on a Stripe Checkout page run on
//                    the store's account. The ticket turns paid in
//                    stripe-connect-webhook.
//
// Secrets: STRIPE_SECRET_KEY, BILLING_RETURN_PREFIXES.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stripe's minimum Checkout lifetime is 30 minutes.
const CHECKOUT_LIFETIME_SECONDS = 31 * 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

class TicketError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

function checkReturnUrl(url: unknown): string {
  if (!isAllowedReturnUrl(url)) throw new TicketError("INVALID_RETURN_URL");
  return url;
}

// Postgres RAISE EXCEPTION codes that are meant for the app.
const RPC_ERRORS = [
  "TICKET_NOT_ON_SALE",
  "STORE_NOT_SELLING",
  "CANNOT_BUY_TICKET",
  "TOO_MANY_PENDING",
  "ALREADY_HAS_TICKET",
  "WAIVER_REQUIRED",
  "WAIVER_CHANGED",
  "INVALID_WAIVER",
  "REQUEST_NOT_FOUND",
  "NOT_ELIGIBLE",
];

function rpcError(error: { message?: string }): Error {
  const code = RPC_ERRORS.find((c) => error.message?.includes(c));
  return code ? new TicketError(code) : new Error(error.message);
}

async function refreshAccount(admin: SupabaseClient, accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);
  const { error } = await admin.rpc("_update_ticketing_account", {
    p_account_id: account.id,
    p_charges_enabled: account.charges_enabled,
    p_details_submitted: account.details_submitted,
    p_currency: account.default_currency ?? "",
  });
  if (error) throw error;
}

async function storeAccountId(admin: SupabaseClient, profileId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("store_ticketing")
    .select("stripe_account_id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data?.stripe_account_id ?? null;
}

// Expires the skater's unpaid Stripe Checkout sessions for this ticket
// type. Best effort: a session that's already gone or paid is skipped (a
// paid duplicate is refunded by stripe-connect-webhook).
async function closeOpenCheckouts(admin: SupabaseClient, buyerId: string, ticketTypeId: string) {
  const { data: open, error } = await admin
    .from("tickets")
    .select("stripe_checkout_session_id, store_owner_id")
    .eq("buyer_id", buyerId)
    .eq("ticket_type_id", ticketTypeId)
    .eq("status", "pending")
    .not("stripe_checkout_session_id", "is", null);
  if (error) throw error;

  for (const row of open ?? []) {
    const accountId = await storeAccountId(admin, row.store_owner_id);
    if (!accountId) continue;
    try {
      await stripe.checkout.sessions.expire(row.stripe_checkout_session_id, undefined, { stripeAccount: accountId });
    } catch {
      // Already expired or completed.
    }
    await admin.rpc("_expire_ticket_purchase", { p_session_id: row.stripe_checkout_session_id });
  }
}

// Refunds a refund request's payment on the store's own Stripe account
// (Stripe keeps its fee), then closes the ticket and the request. The
// idempotency key makes a retried call safe.
async function refundRequest(admin: SupabaseClient, requestId: string, storeId: string) {
  const { data: rows, error } = await admin.rpc("_begin_request_refund", {
    p_request_id: requestId,
    p_store: storeId,
  });
  if (error) throw rpcError(error);
  const refund = (rows as { payment_intent_id: string; stripe_account_id: string }[])[0];
  if (!refund?.stripe_account_id) throw new TicketError("REQUEST_NOT_FOUND");

  await stripe.refunds.create(
    { payment_intent: refund.payment_intent_id, reason: "requested_by_customer" },
    { stripeAccount: refund.stripe_account_id, idempotencyKey: `ticket-request-refund-${requestId}` }
  );
  const { error: finishError } = await admin.rpc("_finish_request_refund", { p_request_id: requestId });
  if (finishError) throw finishError;
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

    if (action === "connect_onboard" || action === "connect_refresh") {
      const { data: profile } = await admin
        .from("profiles")
        .select("account_type, display_name")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (!profile || profile.account_type !== "store") throw new TicketError("NOT_STORE_ACCOUNT", 403);
      // Approved, paid and unbanned.
      const { data: canEdit, error: canEditError } = await admin.rpc("_store_can_edit_page", {
        p_profile_id: user.id,
      });
      if (canEditError) throw canEditError;
      if (!canEdit) throw new TicketError("STORE_NOT_APPROVED", 403);

      let accountId = await storeAccountId(admin, user.id);

      if (action === "connect_refresh") {
        if (accountId) await refreshAccount(admin, accountId);
        return json({ ok: true });
      }

      const returnUrl = checkReturnUrl(body.returnUrl);
      if (!accountId) {
        // Accounts v2: like the old Standard accounts. The store gets the
        // full Stripe dashboard, Stripe charges it fees and covers losses,
        // and the merchant configuration lets it take card payments.
        const account = await stripeV2<{ id: string }>(
          "/v2/core/accounts",
          {
            contact_email: user.email,
            ...(profile.display_name ? { display_name: profile.display_name } : {}),
            identity: { country: "gb" },
            dashboard: "full",
            configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
            defaults: { responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } },
            metadata: { profile_id: user.id },
          },
          // Two quick taps must not make two accounts. The key changes each
          // minute because Stripe replays a key's result for 24 hours,
          // errors included, so a fixed key would make one failure
          // permanent for a day.
          `ticketing-account-${user.id}-${Math.floor(Date.now() / 60_000)}`
        );
        const { error } = await admin.rpc("_save_ticketing_account", {
          p_profile_id: user.id,
          p_account_id: account.id,
        });
        if (error) throw error;
        accountId = (await storeAccountId(admin, user.id))!;
      }

      const link = await stripeV2<{ url: string }>("/v2/core/account_links", {
        account: accountId,
        use_case: {
          type: "account_onboarding",
          account_onboarding: { refresh_url: returnUrl, return_url: returnUrl },
        },
      });
      return json({ url: link.url });
    }

    if (action === "auto_refund") {
      // A skater's refund request at a store that auto-refunds tickets at
      // this price: refund it now, without waiting for the store.
      if (typeof body.requestId !== "string") throw new TicketError("REQUEST_NOT_FOUND");
      const { data: storeId, error: ruleError } = await admin.rpc("_auto_refund_store", {
        p_request_id: body.requestId,
        p_buyer: user.id,
      });
      if (ruleError) throw ruleError;
      // Not covered by the store's rule: it stays waiting for the store.
      if (!storeId) return json({ ok: true, refunded: false });
      await refundRequest(admin, body.requestId, storeId as string);
      return json({ ok: true, refunded: true });
    }

    if (action === "refund_request") {
      // The store approves a skater's refund request: refund the payment on
      // the store's own Stripe account (Stripe keeps its fee), then close
      // the ticket and the request.
      if (typeof body.requestId !== "string") throw new TicketError("REQUEST_NOT_FOUND");
      const { data: profile } = await admin
        .from("profiles")
        .select("account_type")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (profile?.account_type !== "store") throw new TicketError("NOT_STORE_ACCOUNT", 403);

      await refundRequest(admin, body.requestId, user.id);
      return json({ ok: true });
    }

    if (action === "checkout") {
      const returnUrl = checkReturnUrl(body.returnUrl);
      if (typeof body.ticketTypeId !== "string") throw new TicketError("TICKET_NOT_ON_SALE");

      // One ticket per skater per type: close any checkout for this ticket
      // the skater left open, so they can't pay for two.
      await closeOpenCheckouts(admin, user.id, body.ticketTypeId);

      const { data: rows, error } = await admin.rpc("_begin_ticket_purchase", {
        p_buyer: user.id,
        p_ticket_type_id: body.ticketTypeId,
      });
      if (error) throw rpcError(error);
      const ticket = (rows as {
        ticket_id: string;
        stripe_account_id: string;
        name: string;
        description: string | null;
        price_minor: number;
        currency: string;
      }[])[0];

      try {
        // The store's waiver, signed in the app before paying. Required
        // when the store has one; ignored when it doesn't.
        const { error: waiverError } = await admin.rpc("_attach_ticket_waiver", {
          p_ticket_id: ticket.ticket_id,
          p_buyer: user.id,
          p_waiver: body.waiver ?? null,
        });
        if (waiverError) throw rpcError(waiverError);

        const session = await stripe.checkout.sessions.create(
          {
            mode: "payment",
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: ticket.currency.toLowerCase(),
                  unit_amount: ticket.price_minor,
                  product_data: {
                    name: ticket.name,
                    ...(ticket.description ? { description: ticket.description } : {}),
                  },
                },
              },
            ],
            // No email is prefilled: the buyer chooses what to share with
            // the store for the receipt (a Child's contact details are never
            // passed to a store).
            client_reference_id: ticket.ticket_id,
            metadata: { ticket_id: ticket.ticket_id, purpose: "ticket" },
            payment_intent_data: { metadata: { ticket_id: ticket.ticket_id } },
            success_url: returnUrl,
            cancel_url: returnUrl,
            expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_LIFETIME_SECONDS,
          },
          { stripeAccount: ticket.stripe_account_id, idempotencyKey: `ticket-checkout-${ticket.ticket_id}` }
        );
        const { error: attachError } = await admin.rpc("_attach_ticket_checkout", {
          p_ticket_id: ticket.ticket_id,
          p_session_id: session.id,
        });
        if (attachError) throw attachError;
        return json({ url: session.url });
      } catch (err) {
        await admin.rpc("_abandon_ticket_purchase", { p_ticket_id: ticket.ticket_id });
        throw err;
      }
    }

    throw new TicketError("UNKNOWN_ACTION");
  } catch (err) {
    if (err instanceof TicketError) return json({ error: err.code }, err.status);
    console.error("tickets", err);
    return json({ error: "TICKETS_UNAVAILABLE" }, 500);
  }
});
