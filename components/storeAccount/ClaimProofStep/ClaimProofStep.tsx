import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { pickEvidenceFile } from "@/lib/storeAccounts/evidencePicker";
import { removeClaimEvidence, submitStoreClaim, uploadClaimEvidence } from "@/lib/storeAccounts/mutations";
import { evidenceFileLabel } from "@/lib/storeAccounts/queries";
import { useStoreOnboardingAction } from "@/lib/storeAccounts/hooks/useStoreOnboardingAction";
import { MAX_CLAIM_EVIDENCE_FILES, StoreAccountError, type StoreClaim } from "@/lib/storeAccounts/types";
import { C } from "@/lib/theme";
import { ClaimedStoreSummaryCard } from "@/components/storeAccount/ClaimedStoreSummaryCard";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { StoreTextField } from "@/components/storeAccount/StoreTextField";
import { styles } from "./ClaimProofStep.styles";

type Props = {
  claim: StoreClaim;
  onChangeStore: () => void;
  onEditDetails: () => void;
  onEditPhotos: () => void;
};

type SubmitVariables = { paths: string[]; note: string };

export function ClaimProofStep({ claim, onChangeStore, onEditDetails, onEditPhotos }: Props) {
  const { profile, session } = useAuthContext();
  const [paths, setPaths] = useState<string[]>(claim.evidencePaths);
  const [note, setNote] = useState(claim.applicantNote ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = useStoreOnboardingAction(({ paths: evidence, note: message }: SubmitVariables) =>
    submitStoreClaim(evidence, message)
  );

  const handleAdd = async () => {
    if (!profile) return;
    setError(null);
    try {
      const file = await pickEvidenceFile();
      if (!file) return;
      setIsUploading(true);
      const path = await uploadClaimEvidence(profile.profile_id, file);
      setPaths((prev) => [...prev, path]);
    } catch (err) {
      setError(err instanceof StoreAccountError ? err.message : "Upload failed. Try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (path: string) => {
    setPaths((prev) => prev.filter((p) => p !== path));
    // Best effort: an orphaned file in the account's own private folder is harmless.
    removeClaimEvidence(path).catch(() => {});
  };

  const handleSubmit = () => {
    if (paths.length === 0) {
      setError("Add at least one proof document.");
      return;
    }
    setError(null);
    submit.mutate(
      { paths, note },
      { onError: (err) => setError(err instanceof StoreAccountError ? err.message : "Couldn't submit. Try again.") }
    );
  };

  const accountEmail = session?.user.email ?? "";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PROVE YOU OWN IT</Text>
      {claim.store ? <ClaimedStoreSummaryCard store={claim.store} onChange={onChangeStore} /> : null}

      <Text style={styles.body}>
        Upload documents that link your business to this store, such as a business registration, a utility bill or
        lease for the store&apos;s address, or a bank statement in the business name. PDF or image, up to 10 MB each.
      </Text>
      {claim.store?.website && !claim.store.createdByMe ? (
        <Text style={styles.tip}>
          Tip: you signed up with {accountEmail}. If that email is at your store&apos;s website domain, your claim is
          reviewed faster.
        </Text>
      ) : null}

      <View style={styles.files}>
        {paths.map((path, index) => (
          <View key={path} style={styles.file}>
            <Ionicons name="document-text-outline" size={18} color={C.primary} />
            <Text style={styles.fileName}>{evidenceFileLabel(path, index)}</Text>
            <TouchableOpacity onPress={() => handleRemove(path)} hitSlop={8}>
              <Ionicons name="close" size={18} color={C.muted} />
            </TouchableOpacity>
          </View>
        ))}
        {paths.length < MAX_CLAIM_EVIDENCE_FILES ? (
          <TouchableOpacity style={styles.addFile} onPress={handleAdd} disabled={isUploading} activeOpacity={0.75}>
            {isUploading ? (
              <ActivityIndicator color={C.primary} />
            ) : (
              <>
                <Ionicons name="add" size={18} color={C.primary} />
                <Text style={styles.addFileText}>ADD DOCUMENT</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      <StoreTextField
        label="ANYTHING WE SHOULD KNOW?"
        hint="Optional"
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={1000}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <StorePrimaryButton label="SUBMIT FOR REVIEW" onPress={handleSubmit} isBusy={submit.isPending} disabled={isUploading} />
      <StorePrimaryButton label="EDIT STORE PHOTOS" variant="secondary" onPress={onEditPhotos} />
      <StorePrimaryButton label="EDIT BUSINESS DETAILS" variant="secondary" onPress={onEditDetails} />
    </View>
  );
}
