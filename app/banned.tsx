import { useAuthContext } from "@/lib/context/use-auth-context";
import { useBanAppealStatus } from "@/lib/profiles/hooks/useBanAppealStatus";
import { BanAppealError, submitBanAppeal } from "@/lib/profiles/mutations";
import { supabase } from "@/lib/supabaseClient";
import { C, F } from "@/lib/theme";
import { queryKeys } from "@/utils/queryKeys";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { DeactivateAccountButton } from "@/components/common/DeactivateAccountButton";

// A banned account can still sign in (see
// 20260927000000_bans_without_auth_lockout.sql) -- this screen, not an
// Auth-level lock, is what confines it. That means there's usually a live
// session here, so the username field is prefilled from it; the form still
// accepts a typed username too, since submit_ban_appeal is anonymous-
// callable (keyed by username, not auth.uid()) for the rarer case of
// reaching this screen without a session at all.
export default function BannedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [testimony, setTestimony] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Three-state, not just "has an appeal" -- signing out and back in used to
  // re-show a fresh form every time (submit_ban_appeal now rejects a second
  // submission server-side too), and a denied appeal used to look identical
  // to a still-pending one with no way to tell the difference.
  const { data: appealStatus } = useBanAppealStatus(profile?.profile_id ?? null);
  const isCheckingAppealStatus = profile != null && appealStatus === undefined;
  const showPending = submitted || appealStatus === "pending";
  const showDenied = !submitted && appealStatus === "denied";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/Login");
  }

  async function handleSubmitAppeal() {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await submitBanAppeal(username.trim(), testimony.trim());
      setSubmitted(true);
      if (profile) {
        queryClient.invalidateQueries({ queryKey: queryKeys.banAppealStatus(profile.profile_id) });
      }
    } catch (e) {
      if (e instanceof BanAppealError && e.code === "ALREADY_APPEALED") {
        setSubmitted(true);
      } else {
        setErrorMsg(e instanceof BanAppealError ? e.message : "Something went wrong — try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const isValid = username.trim().length > 0 && testimony.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Ionicons name="ban-outline" size={48} color={C.error} />
        <Text style={styles.title}>YOU HAVE BEEN BANNED</Text>
        <Text style={styles.message}>
          Your account has been suspended for violating community guidelines. This action is
          permanent unless an admin reinstates it. You have at least 30 days from your ban to
          submit an appeal before your account and data may be permanently deleted.
        </Text>

        {isCheckingAppealStatus ? (
          <ActivityIndicator color={C.primary} />
        ) : showDenied ? (
          <View style={styles.appealSection}>
            <Text style={styles.appealDenied}>
              Your appeal was denied. In 30 days, your account and data will be permanently
              deleted — or you can deactivate it yourself sooner below.
            </Text>
          </View>
        ) : showPending ? (
          <View style={styles.appealSection}>
            <Text style={styles.appealSubmitted}>
              Your appeal has been submitted. An admin will review it.
            </Text>
          </View>
        ) : (
          <View style={styles.appealSection}>
            <Text style={styles.appealLabel}>APPEAL THIS BAN</Text>
            <TextInput
              style={styles.input}
              placeholder="Your username"
              placeholderTextColor={C.muted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Why should you be unbanned?"
              placeholderTextColor={C.muted}
              value={testimony}
              onChangeText={setTestimony}
              maxLength={500}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <TouchableOpacity
              style={[styles.btn, (!isValid || isSubmitting) && styles.btnDisabled]}
              onPress={handleSubmitAppeal}
              disabled={!isValid || isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={C.onPrimary} />
              ) : (
                <Text style={styles.btnText}>SUBMIT APPEAL</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.deactivateSection}>
          <Text style={styles.deactivateLabel}>
            {showDenied
              ? "YOU CAN DEACTIVATE YOUR ACCOUNT AND DELETE YOUR DATA NOW INSTEAD OF WAITING."
              : "DON'T WANT TO APPEAL? YOU CAN DEACTIVATE YOUR ACCOUNT AND DELETE YOUR DATA INSTEAD."}
          </Text>
          <DeactivateAccountButton />
        </View>

        <TouchableOpacity onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={styles.backLink}>BACK TO LOGIN</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  container: {
    flexGrow: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  title: {
    fontFamily: F.heading,
    fontSize: 22,
    color: C.text,
    letterSpacing: 1,
    textAlign: "center",
  },
  message: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.textVariant,
    textAlign: "center",
    lineHeight: 20,
  },
  appealSection: {
    width: "100%",
    gap: 10,
    marginTop: 8,
  },
  appealLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
    textAlign: "center",
  },
  appealSubmitted: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.text,
    textAlign: "center",
    lineHeight: 20,
  },
  appealDenied: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.error,
    textAlign: "center",
    lineHeight: 20,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    color: C.text,
    fontFamily: F.body,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 100,
  },
  errorText: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.error,
    textAlign: "center",
  },
  btn: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.onPrimary,
    letterSpacing: 1,
  },
  backLink: {
    marginTop: 4,
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 1,
  },
  deactivateSection: {
    width: "100%",
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.borderVariant,
  },
  deactivateLabel: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.5,
    textAlign: "center",
    lineHeight: 16,
  },
});
