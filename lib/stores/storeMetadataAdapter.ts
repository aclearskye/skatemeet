import { upsertStoreMetadata } from "@/lib/stores/metadataMutations";
import { fetchStoreMetadata } from "@/lib/stores/metadataQueries";
import { StoreMetadata } from "@/lib/stores/types";
import { EntityMetadataAdapter } from "@/lib/shared/hooks/useEntityMetadata";

export const storeMetadataAdapter: EntityMetadataAdapter<StoreMetadata> = {
  fetchMetadata: fetchStoreMetadata,
  upsertMetadata: (storeId, osmPlaceId, payload) =>
    upsertStoreMetadata(storeId, osmPlaceId, payload),
};
