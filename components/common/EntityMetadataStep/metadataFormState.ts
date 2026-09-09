import {
  EntityMetadataBase,
  Facility,
  OpeningHours,
  ParkingType,
  UpsertMetadataPayload,
  WEEKDAYS,
} from "@/lib/shared/types";

export type MetadataFormState = {
  openingHours: OpeningHours;
  facilities: Facility[];
  parking: ParkingType | null;
  petFriendly: boolean | null;
  paid: boolean | null;
  wellLit: boolean | null;
};

function emptyOpeningHours(): OpeningHours {
  return WEEKDAYS.reduce((acc, day) => {
    acc[day] = { closed: true, open: null, close: null };
    return acc;
  }, {} as OpeningHours);
}

export function createEmptyMetadataFormState(): MetadataFormState {
  return {
    openingHours: emptyOpeningHours(),
    facilities: [],
    parking: null,
    petFriendly: null,
    paid: null,
    wellLit: null,
  };
}

export function metadataFormStateFromMetadata(
  metadata: EntityMetadataBase | null
): MetadataFormState {
  if (!metadata) return createEmptyMetadataFormState();
  return {
    openingHours: metadata.opening_hours ?? emptyOpeningHours(),
    facilities: metadata.facilities,
    parking: metadata.parking,
    petFriendly: metadata.pet_friendly,
    paid: metadata.paid,
    wellLit: metadata.well_lit,
  };
}

export function metadataFormStateToPayload(state: MetadataFormState): UpsertMetadataPayload {
  return {
    opening_hours: state.openingHours,
    facilities: state.facilities,
    parking: state.parking,
    pet_friendly: state.petFriendly,
    paid: state.paid,
    well_lit: state.wellLit,
  };
}
