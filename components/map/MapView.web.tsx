import { forwardRef } from "react";
import type MapViewNative from "react-native-maps";
// Runtime resolves via Metro's ".web.js" platform-extension resolution on this bare specifier.
import * as WebMapsRuntime from "@teovilla/react-native-web-maps";
// @teovilla/react-native-web-maps' package.json "types" field always points at its
// near-empty native-fallback declarations (missing the default MapView/Marker exports
// entirely), so the runtime import above can't be typed directly — pull the real
// (web-specific) types from the package's own web declaration file instead. The
// googleMapsApiKey/provider/options props used below come from web-maps-override.d.ts,
// which activates this package's own MapViewProps augmentation.
import type { default as WebMapViewType, Marker as WebMarkerType } from "@teovilla/react-native-web-maps/dist/typescript/index.web";

const webMaps = WebMapsRuntime as unknown as { default: typeof WebMapViewType; Marker: typeof WebMarkerType };
const WebMapView = webMaps.default;
export const Marker = webMaps.Marker;
export const PROVIDER_GOOGLE = "google";

const GOOGLE_MAPS_WEB_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY;

type Props = React.ComponentProps<typeof WebMapViewType>;
type Region = NonNullable<Props["initialRegion"]>;

// The web shim derives its initial map center from `initialRegion` but ignores
// its lat/lng deltas entirely for zoom (always defaulting to a world-view zoom
// of 3) — it only reads zoom from `initialCamera`. Derive one from the region
// so the map opens zoomed to the user's location instead of fully zoomed out.
function regionToInitialCamera(region: Region) {
  const zoom = Math.round(Math.log2(360 / region.longitudeDelta));
  return {
    center: { latitude: region.latitude, longitude: region.longitude },
    zoom: Math.min(20, Math.max(2, zoom)),
    heading: 0,
    pitch: 0,
  };
}

// @teovilla/react-native-web-maps refuses to render unless `provider="google"`
// is passed explicitly, and needs the JS API key on every instance — both are
// forced here so call sites can stay platform-agnostic. `fullscreenControl` is
// forced off too: Google's default fullscreen button sits in the same corner
// as the app's hamburger menu button and overlaps it. `mapTypeControl` (the
// Map/Satellite toggle) is forced off since it renders under the search bar.
// `streetViewControl` removes the draggable Pegman icon, `zoomControl` removes
// the +/- buttons, and `cameraControl` removes the separate collapsed circular
// button that expands into a tilt/rotate/pan cluster — `rotateControl` alone
// doesn't cover it, `cameraControl` is its own distinct MapOptions field.
// `gestureHandling: "greedy"` lets a plain scroll zoom the map instead of
// requiring Ctrl/Cmd.
export const MapView = forwardRef<MapViewNative, Props>(({ initialCamera, options, ...props }, ref) => (
  <WebMapView
    {...props}
    ref={ref}
    provider="google"
    googleMapsApiKey={GOOGLE_MAPS_WEB_API_KEY}
    initialCamera={initialCamera ?? (props.initialRegion ? regionToInitialCamera(props.initialRegion) : undefined)}
    options={{
      ...options,
      fullscreenControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      zoomControl: false,
      rotateControl: false,
      cameraControl: false,
      gestureHandling: "greedy",
    }}
  />
));
MapView.displayName = "MapView";
