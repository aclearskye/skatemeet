import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { connectStorefront, disconnectStorefront } from "@/lib/commerce/mutations";
import type { ConnectStorefrontPayload } from "@/lib/commerce/types";
import { queryKeys } from "@/utils/queryKeys";

// Connect or disconnect the store's platform, then refresh it and the
// store's own shop view.
export function useStorefrontConnection() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const profileId = profile?.profile_id ?? "";
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.myStorefront(profileId) }),
      queryClient.invalidateQueries({ queryKey: ["commerce"] }),
    ]);

  const connect = useMutation({
    mutationFn: (payload: ConnectStorefrontPayload) => connectStorefront(payload),
    onSuccess: refresh,
  });
  const disconnect = useMutation({ mutationFn: disconnectStorefront, onSuccess: refresh });

  return { connect, disconnect };
}
