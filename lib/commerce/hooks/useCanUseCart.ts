import { useAuthContext } from "@/lib/context/use-auth-context";

// The cart is for signed-in Adults only: Children browse, and Store
// accounts can't buy. The server enforces this (_can_buy); this only
// decides what to show. "Adult" is the 18+ gate until the Child band lands.
export function useCanUseCart(): boolean {
  const { profile } = useAuthContext();
  return profile?.account_type === "user" && !!profile.age_confirmed_at;
}
