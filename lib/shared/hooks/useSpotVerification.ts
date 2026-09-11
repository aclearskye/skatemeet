import { fetchSpotVerificationStatus } from "@/lib/spots/verificationQueries";
import { requestSpotVerification, VerificationError } from "@/lib/spots/verificationMutations";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function useSpotVerification(spotId: string | null) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.spotVerificationStatus(spotId ?? ""),
    queryFn: () => fetchSpotVerificationStatus(spotId!),
    enabled: !!spotId,
  });

  const requestMutation = useMutation({
    mutationFn: () => requestSpotVerification(spotId!),
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.spotVerificationStatus(spotId ?? "") });
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof VerificationError ? error.message : "Couldn't request a review — try again.");
    },
  });

  return {
    isVerified: data?.is_verified ?? false,
    hasPendingRequest: data?.has_pending_request ?? false,
    tokensAvailable: data?.my_tokens ?? 0,
    blockedUntil: data?.my_blocked_until ?? null,
    isLoading,
    errorMessage,
    isSubmitting: requestMutation.isPending,
    requestReview: () => requestMutation.mutate(),
  };
}
