import { Linking, Platform } from "react-native";

type OpenDirectionsArgs = {
  lat: number;
  lng: number;
  label: string;
};

export function openDirections({ lat, lng, label }: OpenDirectionsArgs) {
  const encodedLabel = encodeURIComponent(label);
  const url =
    Platform.OS === "ios"
      ? `maps:0,0?q=${encodedLabel}@${lat},${lng}`
      : Platform.OS === "android"
        ? `geo:${lat},${lng}?q=${lat},${lng}(${encodedLabel})`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  Linking.openURL(url);
}
