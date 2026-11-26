import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "@/lib/shared/keyboard";
import { useMyStorePage } from "@/lib/storeAccounts/hooks/useMyStorePage";
import { useMyStoreWaiver } from "@/lib/tickets/hooks/useMyStoreWaiver";
import { useSaveStoreWaiver } from "@/lib/tickets/hooks/useSaveStoreWaiver";
import { TicketsError } from "@/lib/tickets/types";
import { MAX_WAIVER_LENGTH, MIN_WAIVER_LENGTH, type StoreWaiver } from "@/lib/tickets/waiverTypes";
import { C, F } from "@/lib/theme";
import { BackButton } from "@/components/common/BackButton";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { StoreTextField } from "@/components/storeAccount/StoreTextField";

// The store's waiver: skaters sign it before buying a ticket, and staff
// see it at the scan. Each change is a new version; tickets already sold
// keep the version that was signed.
export default function StoreWaiverScreen() {
  const insets = useSafeAreaInsets();
  const { data: waiver, isLoading } = useMyStoreWaiver();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton />
        <View style={styles.headerText}>
          <Text style={styles.heading}>WAIVER</Text>
          <Text style={styles.subheading}>{"// signed before every ticket"}</Text>
        </View>
      </View>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        // Keyed so a save resets the form to the saved version.
        <WaiverForm key={waiver?.version ?? 0} waiver={waiver ?? null} bottomInset={insets.bottom} />
      )}
    </View>
  );
}

function WaiverForm({ waiver, bottomInset }: { waiver: StoreWaiver | null; bottomInset: number }) {
  const { data: page } = useMyStorePage();
  const save = useSaveStoreWaiver();
  const [body, setBody] = useState(waiver?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const isDirty = body.trim() !== (waiver?.body ?? "").trim();
  const canEdit = page?.canEdit ?? false;

  const handleSave = () => {
    if (body.trim().length < MIN_WAIVER_LENGTH) {
      setError(`Write at least ${MIN_WAIVER_LENGTH} characters.`);
      return;
    }
    setError(null);
    save.mutate(body, {
      onError: (err) => setError(err instanceof TicketsError ? err.message : "Couldn't save. Try again."),
    });
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.hint}>
        {waiver
          ? `Version ${waiver.version}, saved ${new Date(waiver.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}. Saving a change makes a new version: skaters sign the newest one, and tickets already sold keep the version they signed.`
          : "No waiver yet, so skaters buy without signing anything. Paste your waiver and consent text here, and every skater will sign it with their details and an emergency contact before paying."}
      </Text>
      <Text style={styles.hint}>
        You own the signed waivers. SkateMeet keeps each one for 30 days after the ticket is used, refunded or ends,
        then deletes it, so keep your own copies.
      </Text>
      {!canEdit ? <Text style={styles.error}>Changing your waiver needs an active subscription.</Text> : null}

      <StoreTextField
        label={`WAIVER TEXT · ${body.length}/${MAX_WAIVER_LENGTH}`}
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={MAX_WAIVER_LENGTH}
        editable={canEdit}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <StorePrimaryButton
        label={waiver ? "SAVE NEW VERSION" : "SAVE WAIVER"}
        onPress={handleSave}
        isBusy={save.isPending}
        disabled={!canEdit || !isDirty}
      />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  headerText: { flex: 1, gap: 2 },
  heading: { fontFamily: F.heading, fontSize: 20, color: C.text, letterSpacing: 2 },
  subheading: { fontFamily: F.monoRegular, fontSize: 13, color: C.muted, letterSpacing: 0.5 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, gap: 14 },
  hint: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: C.muted },
  error: { fontFamily: F.body, fontSize: 13, color: C.error },
});
