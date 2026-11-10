import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { KeyboardAwareScrollView } from "@/lib/shared/keyboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ageFromDateOfBirth, isUnderageLocked, MIN_AGE, recordUnderageAttempt, type DateOfBirth } from "@/lib/auth/ageGate";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { confirmAge, recordUnderageSelfReport } from "@/lib/profiles/mutations";
import { C, F } from "@/lib/theme";
import { DateOfBirthInput } from "@/components/common/DateOfBirthInput";

// One-time gate for accounts that haven't confirmed the current 18+ minimum
// -- every account onboarded before the 18+ reset (supabase/pending_migrations/age_gate_18_reset_confirmations.sql), or via a
// sign-in path that skipped SignUp. app/_layout.tsx routes here while
// profiles.age_confirmed_at is null. Only the confirmation time is stored,
// never the date of birth.
//
// Failing deactivates the account pending appeal (an 'underage' ban) rather
// than deleting it; refreshing the auth context flips isBanned, and
// app/_layout.tsx then moves the user to app/banned.tsx's appeal form.
export default function AgeCheckScreen() {
  const insets = useSafeAreaInsets();
  const { refreshProfile } = useAuthContext();
  const [dateOfBirth, setDateOfBirth] = useState<DateOfBirth>({ day: "", month: "", year: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleContinue() {
    const age = ageFromDateOfBirth(dateOfBirth);
    if (age === null) {
      setError("Please enter a valid date of birth");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      if ((await isUnderageLocked()) || age < MIN_AGE) {
        await recordUnderageAttempt();
        await recordUnderageSelfReport();
      } else {
        await confirmAge();
      }
      await refreshProfile();
    } catch {
      setError("Couldn't save that — try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>ONE QUICK THING</Text>
      <Text style={styles.body}>
        {`SkateMeet is now for skaters aged ${MIN_AGE} and over. Before you carry on, please confirm your date of birth. We only keep the fact that you've confirmed it, not the date.`}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <DateOfBirthInput value={dateOfBirth} onChange={setDateOfBirth} />

      <TouchableOpacity
        style={[styles.primaryBtn, isSaving && styles.primaryBtnDisabled]}
        onPress={handleContinue}
        disabled={isSaving}
        activeOpacity={0.85}
      >
        {isSaving ? (
          <ActivityIndicator color={C.onPrimary} />
        ) : (
          <Text style={styles.primaryText}>CONTINUE</Text>
        )}
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: {
    paddingHorizontal: 24,
    gap: 18,
  },
  heading: {
    fontFamily: F.heading,
    fontSize: 28,
    color: C.text,
    letterSpacing: 1.5,
  },
  body: {
    fontFamily: F.body,
    fontSize: 15,
    color: C.muted,
    lineHeight: 22,
  },
  error: {
    fontFamily: F.body,
    fontSize: 13,
    color: C.error,
  },
  primaryBtn: {
    backgroundColor: C.primary,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryText: {
    fontFamily: F.mono,
    fontSize: 14,
    color: C.onPrimary,
    letterSpacing: 2,
  },
});
