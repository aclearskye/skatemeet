// The DEV account switcher (components/devTools/DevAccountSwitcher). Only
// mounted when __DEV__. The seeded accounts are created by
// scripts/seed-dev-accounts.mjs from the same JSON list.

import devAccounts from "./devAccounts.json";

export type DevAccount = {
  key: string;
  email: string;
  label: string;
  blurb: string;
};

// An extra login added by hand in the switcher. No password means the
// shared seeded password is used.
export type CustomDevAccount = {
  email: string;
  password: string | null;
};

export type DevAccountSettings = {
  sharedPassword: string | null;
  customAccounts: CustomDevAccount[];
};

export const SEEDED_DEV_ACCOUNTS: DevAccount[] = devAccounts;

export const DEV_SETTINGS_STORAGE_KEY = "dev-account-switcher";

export const EMPTY_DEV_SETTINGS: DevAccountSettings = { sharedPassword: null, customAccounts: [] };

export function parseDevSettings(raw: string | null): DevAccountSettings {
  if (!raw) return EMPTY_DEV_SETTINGS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_DEV_SETTINGS;
    const { sharedPassword, customAccounts } = parsed as Partial<DevAccountSettings>;
    return {
      sharedPassword: typeof sharedPassword === "string" ? sharedPassword : null,
      customAccounts: Array.isArray(customAccounts)
        ? customAccounts.filter((a): a is CustomDevAccount => typeof a?.email === "string")
        : [],
    };
  } catch {
    return EMPTY_DEV_SETTINGS;
  }
}
