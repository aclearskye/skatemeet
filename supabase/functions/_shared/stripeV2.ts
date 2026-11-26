// Stripe's v2 API (Accounts v2), called directly: stripe-node 17 predates
// it, and Stripe refuses POST /v1/accounts for new Connect platforms.
// Accounts made here still work with the v1 API (Checkout Sessions with a
// Stripe-Account header, GET /v1/accounts/{id}, v1 account.updated events),
// so only creation and onboarding links go through v2.

const API = "https://api.stripe.com";
// The version Stripe's own error message gave for this account.
const V2_VERSION = "2026-10-28.endive";

export async function stripeV2<TResponse>(
  path: string,
  body: Record<string, unknown>,
  idempotencyKey?: string
): Promise<TResponse> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY") ?? ""}`,
      "Stripe-Version": V2_VERSION,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (json as { error?: { code?: string; message?: string } } | null)?.error;
    throw new Error(`Stripe v2 ${path} ${res.status}: ${error?.code ?? ""} ${error?.message ?? ""}`.trim());
  }
  return json as TResponse;
}
