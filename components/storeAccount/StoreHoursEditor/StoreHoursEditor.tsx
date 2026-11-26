import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useEntityMetadata } from "@/lib/shared/hooks/useEntityMetadata";
import type { OpeningHours } from "@/lib/shared/types";
import { storeMetadataAdapter } from "@/lib/stores/storeMetadataAdapter";
import type { StoreMetadata } from "@/lib/stores/types";
import { C } from "@/lib/theme";
import { queryKeys } from "@/utils/queryKeys";
import { metadataFormStateFromMetadata, metadataFormStateToPayload } from "@/components/common/EntityMetadataStep/metadataFormState";
import { OpeningHoursInput } from "@/components/common/EntityMetadataStep/OpeningHoursInput";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { styles } from "./StoreHoursEditor.styles";

type Props = {
  storeId: string | null;
  osmPlaceId: string | null;
};

// The store's opening hours, from its Page tab. They live in the store's
// metadata (shown on the public page), and the owner can change them even
// while the subscription is unpaid. Facilities stay as they are.
export function StoreHoursEditor({ storeId, osmPlaceId }: Props) {
  const { metadata, isLoading } = useEntityMetadata<StoreMetadata>(
    storeId,
    osmPlaceId,
    storeMetadataAdapter,
    queryKeys.storeMetadata(storeId, osmPlaceId)
  );

  if (isLoading) return <ActivityIndicator color={C.primary} />;
  // Keyed by the record, so the first save (which creates it) starts fresh.
  return <HoursForm key={metadata?.metadata_id ?? "none"} storeId={storeId} osmPlaceId={osmPlaceId} metadata={metadata} />;
}

function HoursForm({ storeId, osmPlaceId, metadata }: Props & { metadata: StoreMetadata | null }) {
  const { upsertMetadata, isSaving } = useEntityMetadata<StoreMetadata>(
    storeId,
    osmPlaceId,
    storeMetadataAdapter,
    queryKeys.storeMetadata(storeId, osmPlaceId)
  );
  const saved = metadataFormStateFromMetadata(metadata);
  const [hours, setHours] = useState<OpeningHours>(saved.openingHours);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const isDirty = JSON.stringify(hours) !== JSON.stringify(saved.openingHours);

  const handleSave = async () => {
    const missing = Object.values(hours).some((day) => !day.closed && (!day.open || !day.close));
    if (missing) {
      setError("Pick an opening and closing time for every open day, or mark it closed.");
      return;
    }
    setError(null);
    try {
      await upsertMetadata(metadataFormStateToPayload({ ...saved, openingHours: hours }));
      setDone(true);
    } catch {
      setError("Couldn't save your hours. Try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Tap a day to open or close it, then set its times.</Text>
      <OpeningHoursInput
        value={hours}
        onChange={(next) => {
          setDone(false);
          setHours(next);
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {done && !isDirty ? <Text style={styles.saved}>Hours saved.</Text> : null}
      <StorePrimaryButton label="SAVE HOURS" onPress={handleSave} isBusy={isSaving} disabled={!isDirty} />
    </View>
  );
}
