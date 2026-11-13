import type { Coordinates } from "@/lib/map/types";

// "place" is a city or area (nearby search). "address" is a street address
// (Store onboarding's "my store isn't listed").
export type PlaceSearchKind = "place" | "address";

// A city or area returned by the geocode-place edge function.
export type PlaceResult = {
  label: string;
  coords: Coordinates;
};

// geocode-place answered 429: this account has searched too often in the
// last minute.
export class PlaceSearchRateLimitedError extends Error {
  constructor() {
    super("RATE_LIMITED");
    this.name = "PlaceSearchRateLimitedError";
  }
}
