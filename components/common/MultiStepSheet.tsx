import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  accent: string;
  onAccent: string;
  step: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isCurrentStepValid: boolean;
  submitLabel?: string;
  children: ReactNode;
};

export function MultiStepSheet({
  visible,
  onClose,
  title,
  accent,
  onAccent,
  step,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  isSubmitting,
  isCurrentStepValid,
  submitLabel = "SUBMIT",
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const isFinalStep = step === totalSteps;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color={C.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.stepRow}>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <View key={s} style={[styles.stepDot, s <= step && { backgroundColor: accent }]} />
          ))}
          <Text style={styles.stepLabel}>STEP {step} OF {totalSteps}</Text>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>

        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <Text style={styles.backBtnText}>BACK</Text>
            </TouchableOpacity>
          )}
          {isFinalStep ? (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: accent },
                isSubmitting && styles.primaryBtnDisabled,
              ]}
              disabled={isSubmitting}
              onPress={onSubmit}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={onAccent} />
              ) : (
                <Text style={[styles.primaryBtnText, { color: onAccent }]}>{submitLabel}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: accent },
                !isCurrentStepValid && styles.primaryBtnDisabled,
              ]}
              disabled={!isCurrentStepValid}
              onPress={onNext}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryBtnText, { color: onAccent }]}>NEXT</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  title: { fontFamily: F.heading, fontSize: 20, color: C.text, letterSpacing: 1 },
  closeBtn: { padding: 4 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  stepDot: { width: 8, height: 8, backgroundColor: C.borderVariant },
  stepLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 1,
    marginLeft: 6,
  },
  body: { flex: 1 },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.borderVariant,
  },
  backBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  backBtnText: { fontFamily: F.mono, fontSize: 12, color: C.muted, letterSpacing: 1 },
  primaryBtn: {
    flex: 2,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1 },
});
