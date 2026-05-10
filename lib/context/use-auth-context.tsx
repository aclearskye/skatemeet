import { Session } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export type AccountType = "user" | "business_pending" | "business_verified";

export type Profile = {
  profile_id: string;
  username: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  onboarding_completed: boolean;
  account_type: AccountType;
  business_name: string | null;
  business_verified_at: string | null;
  disciplines: string[] | null;
  skill_level: string | null;
  city: string | null;
  bio: string | null;
  pronouns: string | null;
  avatar_url: string | null;
};

export type AuthData = {
  session?: Session | null;
  profile?: Profile | null;
  isLoadingAuthContext: boolean;
  isLoggedIn: boolean;
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthData>({
  session: undefined,
  profile: undefined,
  isLoadingAuthContext: true,
  isLoggedIn: false,
  refreshProfile: async () => {},
});

export const useAuthContext = () => useContext(AuthContext);
