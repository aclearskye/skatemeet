import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { KeyboardAwareScrollView } from "@/lib/shared/keyboard";
import { createStoreAccount } from "@/lib/storeAccounts/mutations";
import { C, F, R } from "@/lib/theme";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { StoreTextField } from "@/components/storeAccount/StoreTextField";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Business (Store) sign-up, reached from "Are you a skateboarding business?"
// on Login. A Store isn't a person, so there's no age gate or skate profile.
// Once the email is confirmed, the business signs in on the normal Login
// screen and lands on its Store dashboard (app/(store)).
export default function StoreSignUpScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleSignUp = async () => {
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await createStoreAccount(email.trim(), password);
      if (result.needsEmailConfirmation) {
        setEmailSent(true);
      } else {
        await refreshProfile();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the account. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.confirm}>
          <Text style={styles.heading}>CHECK YOUR INBOX</Text>
          <Text style={styles.body}>
            We&apos;ve sent a confirmation link to <Text style={styles.highlight}>{email.trim()}</Text>. Open it, then
            sign in to set up your store.
          </Text>
          <StorePrimaryButton label="GO TO SIGN IN" onPress={() => router.replace("/Login")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.back} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>

        <Text style={styles.kicker}>{"// SKATEMEET FOR BUSINESS"}</Text>
        <Text style={styles.heading}>LIST YOUR SKATE STORE</Text>
        <Text style={styles.body}>
          Create a business account, claim your store on the map, and manage its page. Use your business email. If
          it&apos;s at your store&apos;s website domain, your claim is reviewed faster.
        </Text>

        <View style={styles.card}>
          <StoreTextField
            label="BUSINESS EMAIL"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <StoreTextField
            label="PASSWORD"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            onToggleSecureEntry={() => setShowPassword((visible) => !visible)}
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <StoreTextField
            label="CONFIRM PASSWORD"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <StorePrimaryButton label="CREATE BUSINESS ACCOUNT" onPress={handleSignUp} isBusy={isLoading} />
        </View>

        <Text style={styles.note}>
          This creates a separate business login. To skate on SkateMeet yourself, use a personal account with a
          different email.
        </Text>
        <TouchableOpacity onPress={() => router.push("/privacy" as never)} style={styles.policyLink}>
          <Text style={styles.link}>Privacy policy</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 24, gap: 16 },
  back: { alignSelf: "flex-start", paddingVertical: 4 },
  kicker: { fontFamily: F.monoRegular, fontSize: 12, letterSpacing: 0.5, color: C.primary },
  heading: { fontFamily: F.heading, fontSize: 30, letterSpacing: 2, color: C.text },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.textVariant },
  highlight: { color: C.primary },
  card: {
    gap: 18,
    padding: 20,
    borderRadius: R,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceLow,
  },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
  note: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted },
  policyLink: { alignSelf: "flex-start" },
  link: { fontFamily: F.bodyBold, fontSize: 14, color: C.primary },
  confirm: { flex: 1, justifyContent: "center", paddingHorizontal: 16, gap: 20 },
});
