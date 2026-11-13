import type { Coordinates } from "@/lib/map/types";

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
