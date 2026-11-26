import type { Ionicons } from "@expo/vector-icons";

// The bottom tab bar's shortcuts (iOS and Android; web has its sidebar).
// Any side-drawer item can be a tab, Settings included. Map, Feed, Search,
// Scan and Profile are real tabs; Upload, Favourites, Chats, Stores and
// Settings are tab buttons that open their screen on top (like Upload
// always has).

export type TabShortcutKey =
  | "map"
  | "feed"
  | "upload"
  | "search"
  | "favourites"
  | "chats"
  | "stores"
  | "scan"
  | "profile"
  | "settings";

export type TabShortcut = {
  key: TabShortcutKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  // The route under app/(tabs)/.
  tabName: string;
  // A tab button that opens this screen instead of switching tabs.
  opens?: string;
  // Approved Store accounts only.
  storeOnly?: boolean;
};

// Also the order they sit in the bar, whatever order they're picked in.
export const TAB_SHORTCUTS: TabShortcut[] = [
  { key: "map", label: "Map", icon: "map-outline", tabName: "map" },
  { key: "feed", label: "Feed", icon: "home-outline", tabName: "index" },
  { key: "upload", label: "Upload", icon: "add-circle-outline", tabName: "upload", opens: "/post/new" },
  { key: "search", label: "Search", icon: "search-outline", tabName: "search" },
  { key: "favourites", label: "Favourites", icon: "heart-outline", tabName: "favourites-tab", opens: "/favourites" },
  { key: "chats", label: "Chats", icon: "chatbubbles-outline", tabName: "chats-tab", opens: "/chats" },
  { key: "stores", label: "Stores", icon: "storefront-outline", tabName: "stores-tab", opens: "/stores" },
  { key: "scan", label: "Scan", icon: "qr-code-outline", tabName: "scan", storeOnly: true },
  { key: "profile", label: "Profile", icon: "person-outline", tabName: "profile" },
  { key: "settings", label: "Settings", icon: "settings-outline", tabName: "settings-tab", opens: "/settings" },
];

export const MIN_TABS = 2;
export const MAX_TABS = 5;

const DEFAULT_KEYS: TabShortcutKey[] = ["map", "feed", "upload", "search", "profile"];

// The bar before the user customises it. A store that sells tickets first
// also gets Scan.
export function defaultTabKeys(scanByDefault: boolean): TabShortcutKey[] {
  return scanByDefault ? ["map", "feed", "search", "scan", "profile"] : DEFAULT_KEYS;
}

// What can be picked: Scan only for approved stores.
export function availableShortcuts(isApprovedStore: boolean): TabShortcut[] {
  return TAB_SHORTCUTS.filter((item) => !item.storeOnly || isApprovedStore);
}

// A real tab screen, not a button that opens one on top. The app needs at
// least one of these in the bar to open on.
export function isScreenTab(key: TabShortcutKey): boolean {
  return !TAB_SHORTCUTS.find((item) => item.key === key)?.opens;
}

// The tab the app opens on: Feed if it's in the bar, otherwise the first
// real tab screen in it.
export function startTab(keys: TabShortcutKey[]): TabShortcut {
  const feed = TAB_SHORTCUTS.find((item) => item.key === "feed")!;
  if (keys.includes("feed")) return feed;
  return TAB_SHORTCUTS.find((item) => keys.includes(item.key) && !item.opens) ?? feed;
}

// The URL path of a tab screen.
export function tabPath(item: TabShortcut): string {
  return item.tabName === "index" ? "/" : `/${item.tabName}`;
}

// The saved choice, cleaned up: known keys only, nothing this account
// can't have, in bar order. Too few left, or no real tab screen to open
// on: back to the defaults.
export function resolveTabKeys(
  saved: TabShortcutKey[] | null,
  isApprovedStore: boolean,
  scanByDefault: boolean
): TabShortcutKey[] {
  const allowed = new Set(availableShortcuts(isApprovedStore).map((item) => item.key));
  const picked = new Set((saved ?? []).filter((key) => allowed.has(key)));
  const keys = TAB_SHORTCUTS.map((item) => item.key).filter((key) => picked.has(key)).slice(0, MAX_TABS);
  if (saved && keys.length >= MIN_TABS && keys.some(isScreenTab)) return keys;
  return defaultTabKeys(scanByDefault && isApprovedStore);
}

export function isTabShortcutKey(value: unknown): value is TabShortcutKey {
  return typeof value === "string" && TAB_SHORTCUTS.some((item) => item.key === value);
}
