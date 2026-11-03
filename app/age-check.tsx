import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ageFromDateOfBirth, isUnderageLocked, MIN_AGE, recordUnderageAttempt, type DateOfBirth } from "@/lib/auth/ageGate";
import { onSignOutButtonPress } from "@/lib/auth/onSignOutButtonPress";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { confirmAge } from "@/lib/profiles/mutations";
import { C, F } from "@/lib/theme";
import { DateOfBirthInput } from "@/components/common/DateOfBirthInput";
import { DeactivateAccountButton } from "@/components/common/DeactivateAccountButton";

// One-time gate for accounts created before the 16+ minimum existed (or
// via a sign-in path that skipped SignUp). app/_layout.tsx routes here
// while profiles.age_confirmed_at is null. Only the confirmation time is
// stored, never the date of birth.
export default function AgeCheckScreen() {
  const insets = useSafeAreaInsets();
  const { refreshProfile } = useAuthContext();
  const [dateOfBirth, setDateOfBirth] = useState<DateOfBirth>({ day: "", month: "", year: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isIneligible, setIsIneligible] = useState(false);

  async function handleContinue() {
    const age = ageFromDateOfBirth(dateOfBirth);
    if (age === null) {
      setError("Please enter a valid date of birth");
      return;
    }
    if ((await isUnderageLocked()) || age < MIN_AGE) {
      await recordUnderageAttempt();
      setIsIneligible(true);
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await confirmAge();
      await refreshProfile();
    } catch {
      setError("Couldn't save that — try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      {isIneligible ? (
        <>
          <Text style={styles.heading}>SORRY</Text>
          <Text style={styles.body}>
            You need to be {MIN_AGE} or older to use SkateMeet. You can delete your account and all
            its data now, or sign out.
          </Text>
          <DeactivateAccountButton label="DELETE MY ACCOUNT" />
          <TouchableOpacity style={styles.secondaryBtn} onPress={onSignOutButtonPress} activeOpacity={0.75}>
            <Text style={styles.secondaryText}>SIGN OUT</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.heading}>ONE QUICK THING</Text>
          <Text style={styles.body}>
            {"Before you carry on, please confirm your date of birth. We only keep the fact that you've confirmed it, not the date."}
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
        </>
      )}
    </ScrollView>
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
  secondaryBtn: {
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 1,
  },
});
