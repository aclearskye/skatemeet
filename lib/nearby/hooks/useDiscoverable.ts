import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useToast } from "@/lib/context/toast-context";
import { updateDiscoverable } from "@/lib/nearby/mutations";

// Whether the signed-in user shows up in other skaters' nearby search. Same
// optimistic pattern as useProfilePrivacy: the toggle flips on tap and the
// last tap is the value saved.
export function useDiscoverable() {
  const { profile, refreshProfile } = useAuthContext();
  const { showToast } = useToast();
  const [optimisticValue, setOptimisticValue] = useState<boolean | null>(null);
  const inFlightRef = useRef(0);

  const mutation = useMutation({
    mutationFn: (isDiscoverable: boolean) => updateDiscoverable(profile!.profile_id, isDiscoverable),
    scope: { id: "discoverable" },
    onMutate: (isDiscoverable) => {
      inFlightRef.current += 1;
      setOptimisticValue(isDiscoverable);
    },
    onSuccess: (_data, isDiscoverable) => {
      showToast({
        message: isDiscoverable ? "YOU'RE DISCOVERABLE TO NEARBY SKATERS" : "YOU'RE HIDDEN FROM NEARBY SEARCH",
        variant: "info",
      });
    },
    onError: () => {
      showToast({ message: "COULDN'T UPDATE DISCOVERABILITY — TRY AGAIN", variant: "danger" });
    },
    onSettled: async () => {
      await refreshProfile();
      inFlightRef.current -= 1;
      if (inFlightRef.current === 0) setOptimisticValue(null);
    },
  });

  return {
    isDiscoverable: optimisticValue ?? profile?.show_in_nearby ?? true,
    // Private accounts are never listed, whatever this is set to.
    isPrivate: profile?.is_private ?? false,
    setDiscoverable: mutation.mutate,
  };
}
