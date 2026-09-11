import { deactivateAccount } from "@/lib/profiles/mutations";
import { useMutation } from "@tanstack/react-query";

export function useDeactivateAccount() {
  return useMutation({ mutationFn: deactivateAccount });
}
