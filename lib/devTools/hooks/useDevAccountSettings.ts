import { useCallback, useEffect, useState } from "react";
import { saveDevSettings } from "@/lib/devTools/mutations";
import { loadDevSettings } from "@/lib/devTools/queries";
import { CustomDevAccount, DevAccountSettings, EMPTY_DEV_SETTINGS } from "@/lib/devTools/types";

// The switcher's device-local settings. Plain state rather than React Query:
// switching accounts signs out, which clears the whole query client.
export function useDevAccountSettings() {
  const [settings, setSettings] = useState<DevAccountSettings>(EMPTY_DEV_SETTINGS);

  useEffect(() => {
    loadDevSettings().then(setSettings).catch(() => {});
  }, []);

  const update = useCallback((next: DevAccountSettings) => {
    setSettings(next);
    saveDevSettings(next).catch(() => {});
  }, []);

  const setSharedPassword = useCallback(
    (sharedPassword: string | null) => update({ ...settings, sharedPassword }),
    [settings, update],
  );

  const addCustomAccount = useCallback(
    (account: CustomDevAccount) =>
      update({
        ...settings,
        customAccounts: [...settings.customAccounts.filter((a) => a.email !== account.email), account],
      }),
    [settings, update],
  );

  const removeCustomAccount = useCallback(
    (email: string) =>
      update({ ...settings, customAccounts: settings.customAccounts.filter((a) => a.email !== email) }),
    [settings, update],
  );

  return { settings, setSharedPassword, addCustomAccount, removeCustomAccount };
}
