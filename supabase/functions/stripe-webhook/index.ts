import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cryptoProvider, stripe, subscriptionColumns, type StripeSubscription } from "../_shared/stripe.ts";

// Stripe -> store_billing. Deployed with verify_jwt = false because Stripe
// has no Supabase JWT; the Stripe-Signature header is checked instead
// (STRIPE_WEBHOOK_SECRET).
//
// Events (pick these when adding the endpoint in the Stripe dashboard):
//   checkout.session.completed      a card was saved (setup) or a store resubscribed
//   customer.subscription.created   \
//   customer.subscription.updated    > status, trial and period end
//   customer.subscription.deleted   /
//
// Stripe's retry schedule decides when a store is unpaid: after the last
// weekly retry fails, the subscription becomes 'unpaid' and that arrives
// here as customer.subscription.updated.

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function saveSubscription(sub: StripeSubscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  let query = admin.from("store_billing").update(subscriptionColumns(sub)).eq("stripe_customer_id", customerId);
  // After a resubscribe, late events about the old, dead subscription must
  // not overwrite the new one.
  if (sub.status === "canceled" || sub.status === "incomplete_expired") {
    query = query.or(`stripe_subscription_id.is.null,stripe_subscription_id.eq.${sub.id}`);
  }
  const { error } = await query;
  if (error) throw error;
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
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      cryptoProvider
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (!customerId) break;

        if (session.mode === "setup" && session.setup_intent) {
          const intentId = typeof session.setup_intent === "string" ? session.setup_intent : session.setup_intent.id;
          const intent = await stripe.setupIntents.retrieve(intentId);
          const paymentMethod =
            typeof intent.payment_method === "string" ? intent.payment_method : intent.payment_method?.id;
          if (!paymentMethod) break;
          // The saved card pays every invoice, including the first after the trial.
          await stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: paymentMethod },
          });
          const { error } = await admin
            .from("store_billing")
            .update({ payment_method_ready: true, updated_at: new Date().toISOString() })
            .eq("stripe_customer_id", customerId);
          if (error) throw error;
        } else if (session.mode === "subscription" && session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await saveSubscription(await stripe.subscriptions.retrieve(subId));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        // Events can arrive out of order, so the current state is fetched
        // rather than trusting the event's snapshot.
        await saveSubscription(await stripe.subscriptions.retrieve(event.data.object.id));
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("stripe-webhook", event.type, err);
    // 500 makes Stripe retry the event later.
    return new Response("Handler failed", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
