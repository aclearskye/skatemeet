import { useSpotVerification } from "@/lib/shared/hooks/useSpotVerification";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./RequestVerificationButton.styles";

type Props = {
  spotId: string;
  accent: string;
};

export function RequestVerificationButton({ spotId, accent }: Props) {
  const {
    isVerified,
    hasPendingRequest,
    tokensAvailable,
    blockedUntil,
    isLoading,
    errorMessage,
    isSubmitting,
    requestReview,
  } = useSpotVerification(spotId);

  if (isLoading || isVerified) return null;

  const isBlocked = blockedUntil != null && new Date(blockedUntil) > new Date();
  const outOfTokens = tokensAvailable < 1;
  const disabled = hasPendingRequest || isBlocked || outOfTokens || isSubmitting;

  let hint = "";
  if (hasPendingRequest) hint = "AWAITING ADMIN REVIEW";
  else if (isBlocked) hint = `YOU CAN REQUEST AGAIN AFTER ${new Date(blockedUntil!).toLocaleDateString()}`;
  else if (outOfTokens) hint = "NO REVIEW REQUESTS LEFT";

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={[styles.btn, { borderColor: accent }, disabled && styles.btnDisabled]}
        onPress={requestReview}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {isSubmitting ? (
          <ActivityIndicator color={accent} size="small" />
        ) : (
          <>
            <Ionicons name="shield-checkmark-outline" size={16} color={accent} />
            <Text style={[styles.btnText, { color: accent }]}>
              {hasPendingRequest ? "REVIEW REQUESTED" : "REQUEST ADMIN REVIEW"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {hint !== "" && <Text style={styles.hint}>{hint}</Text>}
      {errorMessage != null && <Text style={styles.error}>{errorMessage}</Text>}
    </View>
  );
}
