import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

// Where Stripe returns to. On web it's the current page. In the app it's a
// deep link that closes the in-app browser session.
export function billingReturnUrl(): string {
  if (Platform.OS === "web") return window.location.href;
  return Linking.createURL("billing-return");
}

// Opens a Stripe-hosted page. Resolves once the user is back in the app
// (native); on web the page navigates away and Stripe brings it back.
export async function openStripePage(url: string, returnUrl: string): Promise<void> {
  if (Platform.OS === "web") {
    window.location.assign(url);
    return;
  }
  await WebBrowser.openAuthSessionAsync(url, returnUrl);
}
