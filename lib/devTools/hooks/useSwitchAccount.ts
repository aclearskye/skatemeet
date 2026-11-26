import { useCallback, useState } from "react";
import { switchToAccount } from "@/lib/devTools/mutations";

// Plain state, not useMutation: the sign-out inside the switch clears the
// query client, mutation cache included.
export function useSwitchAccount(onSwitched: () => void) {
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const switchTo = useCallback(
    async (email: string, password: string) => {
      setPendingEmail(email);
      setError(null);
      try {
        await switchToAccount(email, password);
        onSwitched();
      } catch (err) {
        setError(`${email}: ${err instanceof Error ? err.message : "sign-in failed"}`);
      } finally {
        setPendingEmail(null);
      }
    },
    [onSwitched],
  );

  return { switchTo, pendingEmail, error };
}
