// Return URLs for Stripe-hosted pages come from the client, so only known
// app and site prefixes are accepted (otherwise this would be an open
// redirect via Stripe). BILLING_RETURN_PREFIXES is comma-separated, e.g.
// "https://skatemeet.app/,skatemeet://".
export function isAllowedReturnUrl(url: unknown): url is string {
  const prefixes = (Deno.env.get("BILLING_RETURN_PREFIXES") ?? "skatemeet://")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return typeof url === "string" && prefixes.some((p) => url.startsWith(p));
}
