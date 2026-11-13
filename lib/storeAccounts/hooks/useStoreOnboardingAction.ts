import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";

// Runs one Store onboarding write (save details, choose a store, submit,
// withdraw...) and then refetches the dashboard state, which decides the
// next step. Each step's screen passes its own action.
export function useStoreOnboardingAction<TVariables>(action: (variables: TVariables) => Promise<void>) {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();

  return useMutation({
    mutationFn: action,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.storeOnboarding(profile?.profile_id ?? "") }),
  });
}
