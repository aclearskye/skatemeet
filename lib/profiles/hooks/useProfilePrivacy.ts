import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useToast } from "@/lib/context/toast-context";
import { updateProfilePrivacy } from "@/lib/profiles/mutations";

export function useProfilePrivacy() {
  const { profile, refreshProfile } = useAuthContext();
  const { showToast } = useToast();
  // The switch reads this while a save is in flight, so it flips the moment
  // it's tapped instead of snapping back until refreshProfile's round trip
  // lands with the new is_private.
  const [optimisticValue, setOptimisticValue] = useState<boolean | null>(null);
  const inFlightRef = useRef(0);

  const mutation = useMutation({
    mutationFn: (isPrivate: boolean) => updateProfilePrivacy(profile!.profile_id, isPrivate),
    // Rapid taps run one after another, so the last tap is the value saved.
    scope: { id: "profilePrivacy" },
    onMutate: (isPrivate) => {
      inFlightRef.current += 1;
      setOptimisticValue(isPrivate);
    },
    onError: () => {
      showToast({ message: "COULDN'T UPDATE PRIVACY — TRY AGAIN", variant: "danger" });
    },
    onSettled: async () => {
      await refreshProfile();
      inFlightRef.current -= 1;
      // Only the last queued save hands control back to the profile value,
      // so an earlier save finishing doesn't flicker the switch mid-sequence.
      if (inFlightRef.current === 0) setOptimisticValue(null);
    },
  });

  return {
    isPrivate: optimisticValue ?? profile?.is_private ?? false,
    setIsPrivate: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
