import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { supabase } from "../supabaseClient";

// No `path` here: on web this resolves to the app's own root URL, which the
// router already has a route for. A path like "auth/callback" would resolve
// to a URL with no matching expo-router route, landing on the unmatched-route
// screen before the auth-state listener in app/_layout.tsx gets a chance to
// redirect the user once the session is picked up.
const redirectUri = makeRedirectUri({ scheme: "skatemeet" });

export const DiscordSignIn = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: Platform.OS !== "web",
      },
    });
    if (error) throw new Error("Error during OAuth sign-in: " + error.message);

    // On web, Supabase's own redirect + detectSessionInUrl handles the rest.
    if (Platform.OS === "web" || !data.url) return;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    if (result.type !== "success") return;

    const code = new URL(result.url).searchParams.get("code");
    if (!code) throw new Error("Discord OAuth callback did not include a code");

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw new Error("Error exchanging OAuth code: " + exchangeError.message);
  } catch (error) {
    console.error("Error during OAuth sign-in:", error);
  }
};
