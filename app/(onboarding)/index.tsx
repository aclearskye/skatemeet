import { useAuthContext } from "@/lib/context/use-auth-context";
import { supabase } from "@/lib/supabaseClient";
import { C, F, R } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TOTAL_STEPS = 5;

const DISCIPLINES = [
  { id: "street", label: "Street" },
  { id: "park", label: "Park" },
  { id: "bowl", label: "Bowl" },
  { id: "vert", label: "Vert / Ramps" },
  { id: "transition", label: "Transition" },
  { id: "flatground", label: "Flatground" },
  { id: "cruising", label: "Cruising" },
  { id: "downhill", label: "Downhill" },
];

const SKILL_LEVELS = [
  {
    id: "beginner",
    label: "Just Dropped In",
    desc: "Started skating recently",
  },
  {
    id: "intermediate",
    label: "Still Popping",
    desc: "Getting the basics down",
  },
  {
    id: "dialed",
    label: "Dialed In",
    desc: "Solid tricks, skating spots",
  },
  {
    id: "expert",
    label: "On Lock",
    desc: "Consistent bangers",
  },
  {
    id: "pro",
    label: "Out Here Filming",
    desc: "Retired from trying (but not really)",
  },
];

type OnboardingData = {
  firstName: string;
  lastName: string;
  username: string;
  displayName: string;
  disciplines: string[];
  skillLevel: string;
  city: string;
  bio: string;
};

export default function Onboarding() {
  const { session, refreshProfile } = useAuthContext();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    firstName: "",
    lastName: "",
    username: "",
    displayName: "",
    disciplines: [],
    skillLevel: "",
    city: "",
    bio: "",
  });

  const canAdvance = () => {
    if (step === 0) return data.firstName.trim().length > 0 && data.lastName.trim().length > 0 && data.username.trim().length > 0;
    if (step === 1) return data.displayName.trim().length > 0;
    if (step === 2) return data.disciplines.length > 0;
    if (step === 3) return data.skillLevel.length > 0;
    return true;
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      return;
    }
    await handleSubmit();
  };

  const handleSubmit = async () => {
    if (!session?.user) return;
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        username: data.username.trim(),
        display_name: data.displayName.trim() || null,
        disciplines: data.disciplines.length > 0 ? data.disciplines : null,
        skill_level: data.skillLevel || null,
        city: data.city.trim() || null,
        bio: data.bio.trim() || null,
        onboarding_completed: true,
      })
      .eq("profile_id", session.user.id);
    if (updateError) {
      setLoading(false);
      setError("Couldn't save your profile. Try again.");
      return;
    }
    await refreshProfile();
    setLoading(false);
  };

  const toggleDiscipline = (id: string) => {
    setData((prev) => ({
      ...prev,
      disciplines: prev.disciplines.includes(id)
        ? prev.disciplines.filter((d) => d !== id)
        : [...prev.disciplines, id],
    }));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.headerRow}>
          {step > 0 ? (
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setStep((s) => s - 1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={20} color={C.muted} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}

          <Text style={styles.stepLabel}>
            {step + 1} / {TOTAL_STEPS}
          </Text>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={async () => {
              await supabase.auth.signOut();
              router.replace("/Login");
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={22} color={C.muted} />
          </TouchableOpacity>
        </View>

        {/* Segmented EXP-style progress bar */}
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressSegment,
                i <= step && styles.progressSegmentActive,
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={15}
                color={C.error}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Step 0: Name + username */}
          {step === 0 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>WHO ARE YOU?</Text>
              <Text style={styles.stepSubtitle}>
                Let's get the basics down first.
              </Text>
              <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                  <TextInput
                    style={[styles.fieldInput, { flex: 1 }]}
                    placeholder="First name"
                    placeholderTextColor={C.muted}
                    autoCapitalize="words"
                    autoComplete="off"
                    textContentType="none"
                    autoFocus
                    value={data.firstName}
                    onChangeText={(v) => setData((d) => ({ ...d, firstName: v }))}
                  />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <TextInput
                    style={[styles.fieldInput, { flex: 1 }]}
                    placeholder="Last name"
                    placeholderTextColor={C.muted}
                    autoCapitalize="words"
                    autoComplete="off"
                    textContentType="none"
                    value={data.lastName}
                    onChangeText={(v) => setData((d) => ({ ...d, lastName: v }))}
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.atSign}>@</Text>
                <TextInput
                  style={[styles.fieldInput, { flex: 1 }]}
                  placeholder="username"
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  textContentType="none"
                  value={data.username}
                  onChangeText={(v) => setData((d) => ({ ...d, username: v }))}
                />
              </View>
            </View>
          )}

          {/* Step 1: Display name */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>WHAT'S YOUR SKATE NAME?</Text>
              <Text style={styles.stepSubtitle}>
                This is how the community will know you.
              </Text>
              <TextInput
                style={styles.bigInput}
                placeholder="e.g. GrindKing99"
                placeholderTextColor={C.muted}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                value={data.displayName}
                onChangeText={(v) => setData((d) => ({ ...d, displayName: v }))}
              />
              <Text style={styles.fieldNote}>
                Different from your username — this is your public skate alias.
              </Text>
            </View>
          )}

          {/* Step 2: Disciplines */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>HOW DO YOU ROLL?</Text>
              <Text style={styles.stepSubtitle}>
                Pick all the styles that apply.
              </Text>
              <View style={styles.chipGrid}>
                {DISCIPLINES.map((d) => {
                  const selected = data.disciplines.includes(d.id);
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => toggleDiscipline(d.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.chipTextSelected,
                        ]}
                      >
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Step 3: Skill level */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>HOW LONG YOU BEEN SKATING?</Text>
              <Text style={styles.stepSubtitle}>
                No judgement — we were all kooks once.
              </Text>
              {SKILL_LEVELS.map((level) => {
                const selected = data.skillLevel === level.id;
                return (
                  <TouchableOpacity
                    key={level.id}
                    style={[
                      styles.levelCard,
                      selected && styles.levelCardSelected,
                    ]}
                    onPress={() =>
                      setData((d) => ({ ...d, skillLevel: level.id }))
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.levelCardInner}>
                      <View>
                        <Text
                          style={[
                            styles.levelLabel,
                            selected && styles.levelLabelSelected,
                          ]}
                        >
                          {level.label}
                        </Text>
                        <Text style={styles.levelDesc}>{level.desc}</Text>
                      </View>
                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={C.primary}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Step 4: City + Bio */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>WHERE ARE YOU BASED?</Text>
              <Text style={styles.stepSubtitle}>
                Help us connect you with local skaters.
              </Text>

              <Text style={styles.fieldLabel}>CITY</Text>
              <View style={styles.field}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={C.muted}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  style={[styles.fieldInput, { flex: 1 }]}
                  placeholder="e.g. London, Melbourne, NYC"
                  placeholderTextColor={C.muted}
                  autoCapitalize="words"
                  value={data.city}
                  onChangeText={(v) => setData((d) => ({ ...d, city: v }))}
                />
              </View>

              <Text style={styles.fieldLabel}>
                BIO{" "}
                <Text style={styles.optionalTag}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.bioInput}
                placeholder="Favourite spot, what you're hyped on, whatever…"
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={4}
                maxLength={160}
                value={data.bio}
                onChangeText={(v) => setData((d) => ({ ...d, bio: v }))}
              />
              <Text style={styles.charCount}>{data.bio.length}/160</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.cta}>
          <TouchableOpacity
            style={[
              styles.nextBtn,
              (!canAdvance() || loading) && styles.nextBtnDisabled,
            ]}
            onPress={handleNext}
            disabled={!canAdvance() || loading}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>
              {loading
                ? "SAVING…"
                : step === TOTAL_STEPS - 1
                  ? "LET'S SKATE"
                  : "NEXT"}
            </Text>
            {!loading && step < TOTAL_STEPS - 1 && (
              <Ionicons name="arrow-forward" size={18} color={C.onPrimary} />
            )}
          </TouchableOpacity>

          {step === TOTAL_STEPS - 1 && !loading && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSubmit}
            >
              <Text style={styles.skipBtnText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: R,
    backgroundColor: C.border,
  },
  progressSegmentActive: {
    backgroundColor: C.primary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  stepLabel: {
    color: C.muted,
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
    flex: 1,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.errorDim,
    borderWidth: 1,
    borderColor: C.errorBorder,
    borderRadius: R,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: C.error,
    fontFamily: F.body,
    fontSize: 13,
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    color: C.text,
    fontFamily: F.heading,
    fontSize: 28,
    letterSpacing: 1,
    lineHeight: 32,
    marginBottom: 8,
  },
  stepSubtitle: {
    color: C.muted,
    fontFamily: F.body,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 28,
  },
  bigInput: {
    backgroundColor: "transparent",
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
    paddingHorizontal: 4,
    paddingVertical: 12,
    color: C.text,
    fontFamily: F.bodyBold,
    fontSize: 22,
  },
  fieldNote: {
    color: C.muted,
    fontFamily: F.monoRegular,
    fontSize: 11,
    marginTop: 12,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: R,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surfaceLow,
  },
  chipSelected: {
    borderColor: C.primary,
    backgroundColor: C.surfaceHigh,
  },
  chipText: {
    color: C.muted,
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  chipTextSelected: {
    color: C.primary,
  },
  levelCard: {
    backgroundColor: C.surfaceLow,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: R,
    padding: 16,
    marginBottom: 8,
  },
  levelCardSelected: {
    borderColor: C.primary,
    backgroundColor: C.surfaceHigh,
  },
  levelCardInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelLabel: {
    color: C.muted,
    fontFamily: F.bodyBold,
    fontSize: 15,
    marginBottom: 2,
  },
  levelLabelSelected: {
    color: C.text,
  },
  levelDesc: {
    color: C.muted,
    fontFamily: F.body,
    fontSize: 12,
    opacity: 0.7,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  atSign: {
    color: C.primary,
    fontFamily: F.mono,
    fontSize: 16,
    marginRight: 6,
  },
  fieldLabel: {
    color: C.textVariant,
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 8,
  },
  optionalTag: {
    color: C.muted,
    fontFamily: F.monoRegular,
    fontSize: 11,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    paddingHorizontal: 4,
    height: 52,
    marginBottom: 20,
  },
  fieldInput: {
    color: C.text,
    fontFamily: F.body,
    fontSize: 16,
  },
  bioInput: {
    backgroundColor: C.surfaceLow,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: R,
    padding: 14,
    color: C.text,
    fontFamily: F.body,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    color: C.muted,
    fontFamily: F.mono,
    fontSize: 10,
    textAlign: "right",
    marginTop: 6,
    letterSpacing: 1,
  },
  cta: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 2,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  nextBtn: {
    backgroundColor: C.primary,
    borderRadius: R,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextBtnDisabled: {
    opacity: 0.35,
  },
  nextBtnText: {
    color: C.onPrimary,
    fontFamily: F.mono,
    fontSize: 14,
    letterSpacing: 2,
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  skipBtnText: {
    color: C.muted,
    fontFamily: F.body,
    fontSize: 14,
  },
});
