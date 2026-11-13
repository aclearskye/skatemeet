import { Text, View } from "react-native";
import type { StoreOnboardingStep } from "@/lib/storeAccounts/types";
import { styles } from "./StoreStepIndicator.styles";

type Props = {
  current: StoreOnboardingStep;
};

const STEPS: { key: StoreOnboardingStep; label: string }[] = [
  { key: "details", label: "DETAILS" },
  { key: "store", label: "STORE" },
  { key: "proof", label: "PROOF" },
  { key: "status", label: "REVIEW" },
];

export function StoreStepIndicator({ current }: Props) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);

  return (
    <View style={styles.row}>
      {STEPS.map((step, index) => (
        <View key={step.key} style={[styles.step, index <= currentIndex && styles.stepDone]}>
          <Text style={[styles.label, index === currentIndex && styles.labelCurrent]}>
            {index + 1} {step.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
