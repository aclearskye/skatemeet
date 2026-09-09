import { upsertSpotMetadata } from "@/lib/spots/metadataMutations";
import { fetchSpotMetadata } from "@/lib/spots/metadataQueries";
import { SpotMetadata } from "@/lib/spots/types";
import { EntityMetadataAdapter } from "@/lib/shared/hooks/useEntityMetadata";

export const spotMetadataAdapter: EntityMetadataAdapter<SpotMetadata> = {
  fetchMetadata: fetchSpotMetadata,
  upsertMetadata: (spotId, osmPlaceId, payload) =>
    upsertSpotMetadata(spotId, osmPlaceId, payload),
};
