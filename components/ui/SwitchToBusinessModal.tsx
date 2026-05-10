import { useAuthContext } from "@/lib/context/use-auth-context";
import { supabase } from "@/lib/supabaseClient";
import { C, F, R } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function SwitchToBusinessModal({ visible, onClose }: Props) {
  const { session, refreshProfile } = useAuthContext();
  const insets = useSafeAreaInsets();
  const [businessName, setBusinessName] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bizNameFocused, setBizNameFocused] = useState(false);
  const [urlFocused, setUrlFocused] = useState(false);

  const handleSubmit = async () => {
    if (!session?.user || !businessName.trim()) return;
    setIsSubmitting(true);
    try {
      const [requestResult, profileResult] = await Promise.all([
        supabase.from("business_verification_requests").insert({
          profile_id: session.user.id,
          evidence_url: evidenceUrl.trim() || null,
        }),
        supabase
          .from("profiles")
          .update({ account_type: "business_pending", business_name: businessName.trim() })
          .eq("profile_id", session.user.id),
      ]);

      if (requestResult.error) throw requestResult.error;
      if (profileResult.error) throw profileResult.error;

      await refreshProfile();
      setBusinessName("");
      setEvidenceUrl("");
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.title}>SWITCH TO BUSINESS</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={22} color={C.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.desc}>
            Business accounts can list skate store events and host meetups.
            Requests are reviewed by our team.
          </Text>

          <Text style={styles.fieldLabel}>BUSINESS NAME *</Text>
          <View style={[styles.field, bizNameFocused && styles.fieldFocused]}>
            <TextInput
              style={styles.fieldInput}
              placeholder="Your skate shop or brand name"
              placeholderTextColor={C.muted}
              value={businessName}
              onChangeText={setBusinessName}
              onFocus={() => setBizNameFocused(true)}
              onBlur={() => setBizNameFocused(false)}
            />
          </View>

          <Text style={styles.fieldLabel}>
            EVIDENCE URL{" "}
            <Text style={styles.optionalTag}>(optional)</Text>
          </Text>
          <View style={[styles.field, urlFocused && styles.fieldFocused]}>
            <TextInput
              style={styles.fieldInput}
              placeholder="Link to website, Instagram, etc."
              placeholderTextColor={C.muted}
              value={evidenceUrl}
              onChangeText={setEvidenceUrl}
              autoCapitalize="none"
              keyboardType="url"
              onFocus={() => setUrlFocused(true)}
              onBlur={() => setUrlFocused(false)}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!businessName.trim() || isSubmitting) && styles.btnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!businessName.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={C.onPrimary} />
            ) : (
              <Text style={styles.submitBtnText}>SUBMIT REQUEST</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  title: {
    fontFamily: F.heading,
    fontSize: 22,
    color: C.text,
    letterSpacing: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
    paddingBottom: 48,
  },
  desc: {
    color: C.muted,
    fontFamily: F.body,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 28,
  },
  fieldLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: C.textVariant,
    marginBottom: 8,
  },
  optionalTag: {
    color: C.muted,
    fontFamily: F.monoRegular,
  },
  field: {
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    paddingHorizontal: 4,
    height: 48,
    justifyContent: "center",
    marginBottom: 24,
  },
  fieldFocused: {
    borderBottomColor: C.primary,
  },
  fieldInput: {
    color: C.text,
    fontFamily: F.body,
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: R,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.4 },
  submitBtnText: {
    color: C.onPrimary,
    fontFamily: F.mono,
    fontSize: 13,
    letterSpacing: 2,
  },
});
