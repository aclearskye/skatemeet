import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cryptoProvider, stripe } from "../_shared/stripe.ts";

// Stripe Connect (stores' own accounts) -> store_ticketing and tickets.
// A separate endpoint from stripe-webhook: in the Stripe dashboard it's added
// with "Events on Connected accounts", and it has its own signing secret
// (STRIPE_CONNECT_WEBHOOK_SECRET). Deployed with verify_jwt = false because
// Stripe has no Supabase JWT; the Stripe-Signature header is checked instead.
//
// Events:
//   account.updated             a store finished (or lost) onboarding
//   checkout.session.completed  a ticket was paid for
//   checkout.session.async_payment_succeeded   (delayed payment methods)
//   checkout.session.expired    an abandoned checkout
//   charge.refunded             the store refunded a ticket from its dashboard
//
// A second paid ticket of the same type for one skater (two checkouts paid
// at once) is refunded here straight away: one ticket per skater per type.

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await admin.rpc(name, args);
  if (error) throw error;
  return data;
}

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // The raw body: the signature is over the exact bytes Stripe sent.
  const body = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET")!,
      undefined,
      cryptoProvider
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Every event here comes from a store's own account.
  const accountId = event.account;
  if (!accountId) return new Response(JSON.stringify({ received: true }), { status: 200 });

  try {
    switch (event.type) {
      case "account.updated": {
        const account = event.data.object;
        await rpc("_update_ticketing_account", {
          p_account_id: account.id,
          p_charges_enabled: account.charges_enabled,
          p_details_submitted: account.details_submitted,
          p_currency: account.default_currency ?? "",
        });
        break;
      }
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        if (session.metadata?.purpose !== "ticket" || session.payment_status !== "paid") break;
        const paymentIntent =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        const result = await rpc("_complete_ticket_purchase", {
          p_session_id: session.id,
          p_account_id: accountId,
          p_payment_intent_id: paymentIntent ?? null,
          p_amount_total: session.amount_total ?? -1,
          p_currency: session.currency ?? "",
        });
        if (result === "duplicate" && paymentIntent) {
          // The skater already had this ticket (one per skater per type):
          // give this payment back. The key makes a retried event safe.
          await stripe.refunds.create(
            { payment_intent: paymentIntent, reason: "duplicate" },
            { stripeAccount: accountId, idempotencyKey: `duplicate-ticket-${session.id}` }
          );
        } else if (result === "unmatched") {
          // Paid, but not for what the ticket says (wrong account or
          // amount). Logged for a person to look at; retrying won't help.
          console.error("stripe-connect-webhook: unmatched ticket payment", session.id, accountId);
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object;
        if (session.metadata?.purpose === "ticket") {
          await rpc("_expire_ticket_purchase", { p_session_id: session.id });
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntent =
          typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        // Only a full refund ends the ticket.
        if (paymentIntent && charge.refunded) {
          await rpc("_refund_ticket", { p_payment_intent_id: paymentIntent, p_account_id: accountId });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("stripe-connect-webhook", event.type, err);
    // 500 makes Stripe retry the event later.
    return new Response("Handler failed", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
