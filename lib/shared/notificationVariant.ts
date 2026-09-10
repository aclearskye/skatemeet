import { Ionicons } from "@expo/vector-icons";
import { C } from "@/lib/theme";

// Shared by components/ui/ToastHost and components/notifications/NotificationRow
// so the two surfaces render the same variant consistently without keeping
// two copies of this map in sync.
export type NotificationVariant = "success" | "danger" | "info";

export const VARIANT_COLOR: Record<NotificationVariant, string> = {
  success: C.primary,
  danger: C.secondary,
  info: C.tertiary,
};

export const VARIANT_ICON: Record<NotificationVariant, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  danger: "alert-circle",
  info: "information-circle",
};
