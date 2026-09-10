import { createContext, ReactNode, useCallback, useContext, useState } from "react";
import type { NotificationVariant } from "@/lib/shared/notificationVariant";

// Same underlying variant set as the persisted notifications inbox
// (lib/notifications/types.ts) — kept as a separate alias, not a shared
// domain import, so the two systems (ephemeral toast vs. durable inbox)
// stay decoupled while still rendering variants consistently.
export type ToastVariant = NotificationVariant;

export type ToastItem = {
  id: string;
  message: string;
  label?: string;
  variant: ToastVariant;
};

type ShowToastInput = {
  message: string;
  label?: string;
  variant: ToastVariant;
};

type ToastContextType = {
  queue: ToastItem[];
  showToast: (input: ShowToastInput) => void;
  dismissFront: () => void;
};

const ToastContext = createContext<ToastContextType>({
  queue: [],
  showToast: () => {},
  dismissFront: () => {},
});

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [queue, setQueue] = useState<ToastItem[]>([]);

  const showToast = useCallback((input: ShowToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setQueue((prev) => [...prev, { id, ...input }]);
  }, []);

  const dismissFront = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  return (
    <ToastContext.Provider value={{ queue, showToast, dismissFront }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
