import { useState } from "react";
import { Text, View } from "react-native";
import { saveStoreDetails } from "@/lib/storeAccounts/mutations";
import { useStoreOnboardingAction } from "@/lib/storeAccounts/hooks/useStoreOnboardingAction";
import {
  StoreAccountError,
  type SaveStoreDetailsPayload,
  type StoreBusinessDetails,
  type StorePublicDetails,
} from "@/lib/storeAccounts/types";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { StoreTextField } from "@/components/storeAccount/StoreTextField";
import { styles } from "./BusinessDetailsStep.styles";

type Props = {
  business: StoreBusinessDetails | null;
  publicDetails: StorePublicDetails | null;
  // Shown when editing details from a later step, so the owner can go back.
  onCancel?: () => void;
  onSaved?: () => void;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BusinessDetailsStep({ business, publicDetails, onCancel, onSaved }: Props) {
  const [form, setForm] = useState<SaveStoreDetailsPayload>({
    legalName: business?.legalName ?? "",
    registrationNumber: business?.registrationNumber ?? "",
    contactName: business?.contactName ?? "",
    contactRole: business?.contactRole ?? "",
    publicPhone: publicDetails?.publicPhone ?? "",
    publicEmail: publicDetails?.publicEmail ?? "",
    logoPath: publicDetails?.logoPath ?? null,
    coverPath: publicDetails?.coverPath ?? null,
  });
  const [error, setError] = useState<string | null>(null);
  const save = useStoreOnboardingAction(saveStoreDetails);

  const set = <TKey extends keyof SaveStoreDetailsPayload>(key: TKey, value: SaveStoreDetailsPayload[TKey]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    const required = [form.legalName, form.registrationNumber, form.contactName, form.contactRole];
    if (required.some((value) => value.trim().length < 2)) {
      setError("Fill in your legal name, registration number, contact name and role.");
      return;
    }
    if (form.publicEmail && !EMAIL_REGEX.test(form.publicEmail.trim())) {
      setError("Enter a valid public email, or leave it empty.");
      return;
    }
    setError(null);
    save.mutate(form, {
      onSuccess: () => onSaved?.(),
      onError: (err) => setError(err instanceof StoreAccountError ? err.message : "Couldn't save. Try again."),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>BUSINESS DETAILS</Text>
      <Text style={styles.sectionHint}>Private. Only SkateMeet&apos;s team sees these, to check your claim.</Text>
      <StoreTextField label="LEGAL BUSINESS NAME" value={form.legalName} onChangeText={(v) => set("legalName", v)} maxLength={200} />
      <StoreTextField
        label="REGISTRATION OR TAX NUMBER"
        hint="e.g. company number, ABN, VAT or EIN"
        value={form.registrationNumber}
        onChangeText={(v) => set("registrationNumber", v)}
        autoCapitalize="characters"
        maxLength={64}
      />
      <StoreTextField label="YOUR NAME" value={form.contactName} onChangeText={(v) => set("contactName", v)} maxLength={120} />
      <StoreTextField
        label="YOUR ROLE"
        hint="e.g. Owner, Manager"
        value={form.contactRole}
        onChangeText={(v) => set("contactRole", v)}
        maxLength={80}
      />

      <Text style={[styles.sectionTitle, styles.sectionGap]}>PUBLIC DETAILS</Text>
      <Text style={styles.sectionHint}>
        Shown on your store page once your claim is approved. All optional. You&apos;ll add photos after choosing your
        store.
      </Text>
      <StoreTextField
        label="STORE PHONE"
        value={form.publicPhone ?? ""}
        onChangeText={(v) => set("publicPhone", v)}
        keyboardType="phone-pad"
        maxLength={40}
      />
      <StoreTextField
        label="STORE EMAIL"
        value={form.publicEmail ?? ""}
        onChangeText={(v) => set("publicEmail", v)}
        keyboardType="email-address"
        autoCapitalize="none"
        maxLength={254}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <StorePrimaryButton label="SAVE AND CONTINUE" onPress={handleSave} isBusy={save.isPending} />
      {onCancel ? <StorePrimaryButton label="CANCEL" variant="secondary" onPress={onCancel} /> : null}
    </View>
  );
}
