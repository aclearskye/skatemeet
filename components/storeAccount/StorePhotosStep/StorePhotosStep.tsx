import { useState } from "react";
import { Text, View } from "react-native";
import { saveStoreDetails } from "@/lib/storeAccounts/mutations";
import { useStoreOnboardingAction } from "@/lib/storeAccounts/hooks/useStoreOnboardingAction";
import { StoreAccountError, type StoreBusinessDetails, type StorePublicDetails } from "@/lib/storeAccounts/types";
import { StoreImagePicker } from "@/components/storeAccount/StoreImagePicker";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { styles } from "./StorePhotosStep.styles";

type Props = {
  business: StoreBusinessDetails;
  publicDetails: StorePublicDetails | null;
  // Called after saving or skipping, so the dashboard moves on to proof.
  onDone: () => void;
  // Shown when the owner came back from the proof step.
  onCancel?: () => void;
};

// Logo and cover photo, after the store is chosen. Both optional. They're
// saved through the same RPC as the details, so the rest is sent unchanged.
export function StorePhotosStep({ business, publicDetails, onDone, onCancel }: Props) {
  const [logoPath, setLogoPath] = useState(publicDetails?.logoPath ?? null);
  const [coverPath, setCoverPath] = useState(publicDetails?.coverPath ?? null);
  const [error, setError] = useState<string | null>(null);
  const save = useStoreOnboardingAction(saveStoreDetails);

  const handleSave = () => {
    setError(null);
    save.mutate(
      {
        ...business,
        publicPhone: publicDetails?.publicPhone ?? null,
        publicEmail: publicDetails?.publicEmail ?? null,
        logoPath,
        coverPath,
      },
      {
        onSuccess: onDone,
        onError: (err) => setError(err instanceof StoreAccountError ? err.message : "Couldn't save. Try again."),
      }
    );
  };

  const hasPhotos = Boolean(logoPath || coverPath);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>STORE PHOTOS</Text>
      <Text style={styles.hint}>Shown on your store page once your claim is approved. You can add these later.</Text>
      <StoreImagePicker label="LOGO" shape="square" path={logoPath} onChange={setLogoPath} />
      <StoreImagePicker label="COVER PHOTO" shape="wide" path={coverPath} onChange={setCoverPath} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hasPhotos || onCancel ? (
        <StorePrimaryButton label="SAVE AND CONTINUE" onPress={handleSave} isBusy={save.isPending} />
      ) : (
        <StorePrimaryButton label="SKIP FOR NOW" variant="secondary" onPress={onDone} />
      )}
      {onCancel ? <StorePrimaryButton label="CANCEL" variant="secondary" onPress={onCancel} /> : null}
    </View>
  );
}
