import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

// Hosted pages SkateMeet hands off to: Stripe billing pages, and a store's
// own Shopify or WooCommerce checkout.

// Where a hosted page returns to. On web it's the current page. In the app
// it's a deep link that closes the in-app browser session.
export function hostedPageReturnUrl(): string {
  if (Platform.OS === "web") return window.location.href;
  return Linking.createURL("billing-return");
}

// Resolves once the user is back in the app (native). On web, `newTab`
// keeps SkateMeet open (store checkouts); otherwise the page navigates away
// and the hosted page brings it back (Stripe).
export async function openHostedPage(url: string, returnUrl: string, { newTab = false } = {}): Promise<void> {
  if (Platform.OS === "web") {
    if (newTab) window.open(url, "_blank", "noopener");
    else window.location.assign(url);
    return;
  }
  await WebBrowser.openAuthSessionAsync(url, returnUrl);
}
