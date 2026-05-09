import { useAuthContext } from "@/lib/context/use-auth-context";
import { supabase } from "@/lib/supabaseClient";
import { onSignOutButtonPress } from "@/lib/auth/onSignOutButtonPress";
import { C, F, R } from "@/lib/theme";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AccountType } from "@/lib/context/use-auth-context";

const BADGE_LABELS: Record<AccountType, string> = {
  user: "Regular Account",
  business_pending: "Pending Review",
  business_verified: "Business Verified",
};

const BADGE_COLORS: Record<AccountType, string> = {
  user: C.muted,
  business_pending: C.secondary,
  business_verified: C.primary,
};

const BADGE_TEXT_COLORS: Record<AccountType, string> = {
  user: C.bg,
  business_pending: C.onSecondary,
  business_verified: C.onPrimary,
};

export default function ProfileScreen() {
  const { profile, session, refreshProfile } = useAuthContext();
  const [businessName, setBusinessName] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bizNameFocused, setBizNameFocused] = useState(false);
  const [urlFocused, setUrlFocused] = useState(false);

  const accountType = profile?.account_type ?? "user";

  const handleRequestConversion = async () => {
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
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>PROFILE</Text>

      <View style={styles.card}>
        <Text style={styles.name}>
          {profile.first_name} {profile.last_name}
        </Text>
        <Text style={styles.username}>@{profile.username}</Text>

        <View
          style={[
            styles.badge,
            { backgroundColor: BADGE_COLORS[accountType] },
          ]}
        >
          <Text style={[styles.badgeText, { color: BADGE_TEXT_COLORS[accountType] }]}>
            {BADGE_LABELS[accountType]}
          </Text>
        </View>

        {accountType === "business_verified" && profile.business_name && (
          <Text style={styles.businessName}>{profile.business_name}</Text>
        )}
      </View>

      {accountType === "user" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>SWITCH TO BUSINESS</Text>
          <Text style={styles.sectionDesc}>
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

          <Text style={styles.fieldLabel}>EVIDENCE URL <Text style={styles.optionalTag}>(optional)</Text></Text>
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
              styles.primaryBtn,
              (!businessName.trim() || isSubmitting) && styles.btnDisabled,
            ]}
            onPress={handleRequestConversion}
            disabled={!businessName.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={C.onPrimary} />
            ) : (
              <Text style={styles.primaryBtnText}>SUBMIT REQUEST</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {accountType === "business_pending" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>REQUEST UNDER REVIEW</Text>
          <Text style={styles.sectionDesc}>
            Your business account request is being reviewed. Open the app again
            after approval to see your updated status.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={onSignOutButtonPress}>
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },
  container: { padding: 16, paddingTop: 80, paddingBottom: 40 },
  heading: {
    fontFamily: F.heading,
    fontSize: 32,
    color: C.text,
    letterSpacing: 2,
    marginBottom: 20,
  },
  card: {
    backgroundColor: C.surfaceLow,
    borderRadius: R,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  name: {
    fontFamily: F.bodyBold,
    fontSize: 20,
    color: C.text,
  },
  username: {
    color: C.muted,
    fontFamily: F.monoRegular,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: R,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
  },
  businessName: {
    marginTop: 10,
    color: C.textVariant,
    fontFamily: F.body,
    fontSize: 14,
  },
  sectionTitle: {
    fontFamily: F.heading,
    fontSize: 18,
    color: C.text,
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionDesc: {
    color: C.muted,
    fontFamily: F.body,
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 22,
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
    marginBottom: 20,
  },
  fieldFocused: {
    borderBottomColor: C.primary,
  },
  fieldInput: {
    color: C.text,
    fontFamily: F.body,
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: R,
    padding: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  primaryBtnText: {
    color: C.onPrimary,
    fontFamily: F.mono,
    fontSize: 13,
    letterSpacing: 2,
  },
  signOutBtn: {
    marginTop: 8,
    padding: 14,
    borderRadius: R,
    alignItems: "center",
    borderWidth: 2,
    borderColor: C.border,
  },
  signOutText: {
    color: C.error,
    fontFamily: F.mono,
    fontSize: 12,
    letterSpacing: 2,
  },
});
