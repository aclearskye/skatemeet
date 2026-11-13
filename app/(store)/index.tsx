import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { onSignOutButtonPress } from "@/lib/auth/onSignOutButtonPress";
import { KeyboardAwareScrollView } from "@/lib/shared/keyboard";
import { useStoreBilling } from "@/lib/storeAccounts/hooks/useStoreBilling";
import { useStoreOnboarding } from "@/lib/storeAccounts/hooks/useStoreOnboarding";
import { currentOnboardingStep, type StoreOnboardingStep } from "@/lib/storeAccounts/types";
import { C, F } from "@/lib/theme";
import { BusinessDetailsStep } from "@/components/storeAccount/BusinessDetailsStep";
import { StoreBillingStep } from "@/components/storeAccount/StoreBillingStep";
import { ClaimProofStep } from "@/components/storeAccount/ClaimProofStep";
import { ClaimStatusPanel } from "@/components/storeAccount/ClaimStatusPanel";
import { ClaimStoreStep } from "@/components/storeAccount/ClaimStoreStep";
import { StorePhotosStep } from "@/components/storeAccount/StorePhotosStep";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { StoreStepIndicator } from "@/components/storeAccount/StoreStepIndicator";

// The Store account's whole app until its claim is approved (and, in Phase 1,
// afterwards too): business details -> find or add the store -> photos ->
// payment card -> proof -> review status. The step comes from server state. `override` lets the owner
// step back to edit details or change store while the claim is still a draft.
export default function StoreDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { data: state, isLoading: isLoadingState, isError: isStateError, refetch } = useStoreOnboarding();
  const billing = useStoreBilling();
  const isLoading = isLoadingState || billing.isLoading;
  const isError = isStateError || billing.isError;
  const [override, setOverride] = useState<StoreOnboardingStep | null>(null);
  const [skippedPhotos, setSkippedPhotos] = useState(false);

  const serverStep =
    state && billing.data
      ? currentOnboardingStep(state, { skippedPhotos, cardReady: billing.data.paymentMethodReady })
      : null;
  const step = override ?? serverStep;
  const clearOverride = () => setOverride(null);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerText}>
          <Text style={styles.heading}>BUSINESS ACCOUNT</Text>
          <Text style={styles.subheading}>{"// claim your store"}</Text>
        </View>
        <TouchableOpacity onPress={onSignOutButtonPress} hitSlop={12} style={styles.signOut}>
          <Ionicons name="log-out-outline" size={18} color={C.error} />
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : isError || !state || !step ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={32} color={C.error} />
          <Text style={styles.errorLabel}>COULDN&apos;T LOAD YOUR ACCOUNT</Text>
          <StorePrimaryButton label="TRY AGAIN" variant="secondary" onPress={() => {
              refetch();
              billing.refetch();
            }} />
        </View>
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <StoreStepIndicator current={step} />
          {step === "details" ? (
            <BusinessDetailsStep
              business={state.business}
              publicDetails={state.publicDetails}
              onSaved={clearOverride}
              onCancel={override ? clearOverride : undefined}
            />
          ) : step === "store" ? (
            <ClaimStoreStep onCancel={override ? clearOverride : undefined} onDone={clearOverride} />
          ) : step === "photos" && state.business ? (
            <StorePhotosStep
              business={state.business}
              publicDetails={state.publicDetails}
              onDone={() => {
                setSkippedPhotos(true);
                clearOverride();
              }}
              onCancel={override ? clearOverride : undefined}
            />
          ) : step === "billing" ? (
            <StoreBillingStep onCheckAgain={() => billing.refetch()} isChecking={billing.isFetching} />
          ) : step === "proof" && state.claim ? (
            <ClaimProofStep
              key={state.claim.claimId}
              claim={state.claim}
              onChangeStore={() => setOverride("store")}
              onEditDetails={() => setOverride("details")}
              onEditPhotos={() => setOverride("photos")}
            />
          ) : state.claim ? (
            <ClaimStatusPanel claim={state.claim} />
          ) : null}
        </KeyboardAwareScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  headerText: { flex: 1, gap: 2 },
  heading: { fontFamily: F.heading, fontSize: 20, letterSpacing: 2, color: C.text },
  subheading: { fontFamily: F.monoRegular, fontSize: 13, letterSpacing: 0.5, color: C.muted },
  signOut: { flexDirection: "row", alignItems: "center", gap: 6 },
  signOutText: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: C.error },
  content: { padding: 16, gap: 24 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 16 },
  errorLabel: { fontFamily: F.mono, fontSize: 11, letterSpacing: 2, color: C.muted },
});
