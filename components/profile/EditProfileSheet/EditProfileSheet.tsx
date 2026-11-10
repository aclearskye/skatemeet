import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sanitizeDisplayName } from "@/lib/auth/sanitizeUsername";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useUpdateProfileDetails } from "@/lib/profiles/hooks/useUpdateProfileDetails";
import type { ProfileDetailsPatch } from "@/lib/profiles/mutations";
import { DISCIPLINES, SKILL_LEVELS } from "@/lib/profiles/profileOptions";
import { useKeyboardHeight } from "@/lib/shared/hooks/useKeyboardHeight";
import { parseTapeLabels, type TapeLabel } from "@/lib/shared/tapeLabels";
import { C } from "@/lib/theme";
import { TapeChip } from "@/components/common/TapeChip";
import { TapeLabelInput } from "@/components/common/TapeLabelInput";
import ProfileBadges from "@/components/profile/ProfileBadges";
import { styles } from "./EditProfileSheet.styles";

const SHEET_BOTTOM_PADDING = 24;
// Title + button row + paddings, i.e. the sheet's height outside the
// scrolling form -- used to cap the form so the sheet never runs off the top.
const SHEET_CHROME_HEIGHT = 150;

type Props = {
  visible: boolean;
  onClose: () => void;
};

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function sameLabels(a: TapeLabel[], b: TapeLabel[]): boolean {
  return a.length === b.length && a.every((l, i) => l.text === b[i].text && l.color === b[i].color);
}

// Bottom sheet behind the own-profile pencil: the skate name (display_name)
// and the profile's duct-tape row -- skill level and disciplines (the same
// choices as onboarding) plus the skater's own one-word labels. Pronouns
// aren't edited here.
export function EditProfileSheet({ visible, onClose }: Props) {
  const { profile } = useAuthContext();
  const { updateProfileDetails, isUpdating } = useUpdateProfileDetails();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { height: windowHeight } = useWindowDimensions();

  const initialName = profile?.display_name ?? "";
  const initialSkill = profile?.skill_level ?? null;
  const initialDisciplines = profile?.disciplines ?? [];
  const initialLabels = parseTapeLabels(profile?.labels);

  const [name, setName] = useState(initialName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [skill, setSkill] = useState<string | null>(initialSkill);
  const [disciplines, setDisciplines] = useState<string[]>(initialDisciplines);
  const [labels, setLabels] = useState<TapeLabel[]>(initialLabels);

  // Each open starts from what's saved now.
  useEffect(() => {
    if (!visible) return;
    setName(initialName);
    setNameError(null);
    setSkill(initialSkill);
    setDisciplines(initialDisciplines);
    setLabels(initialLabels);
    // Only on open: re-running on every profile refresh would wipe edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function toggleDiscipline(id: string) {
    setDisciplines((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  async function handleSave() {
    const nameResult = sanitizeDisplayName(name);
    if (nameResult.error) {
      setNameError(nameResult.error);
      return;
    }
    // Only what changed, so an untouched field is never rewritten.
    const patch: ProfileDetailsPatch = {};
    if (nameResult.value !== initialName.trim()) patch.display_name = nameResult.value;
    if (skill !== initialSkill) patch.skill_level = skill;
    if (!sameList(disciplines, initialDisciplines)) patch.disciplines = disciplines.length > 0 ? disciplines : null;
    if (!sameLabels(labels, initialLabels)) patch.labels = labels;
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    try {
      await updateProfileDetails(patch);
      onClose();
    } catch {
      // The hook toasts the failure; the sheet stays open to retry.
    }
  }

  const formMaxHeight = windowHeight - insets.top - keyboardHeight - SHEET_CHROME_HEIGHT;

  return (
    // Translucent bars make the modal span the whole screen on Android, so
    // the keyboard height (measured from the screen's bottom edge) lines up
    // the same way it does on iOS.
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        {/* The sheet's bottom padding grows to sit it on the keyboard while
            it's open, and otherwise clears the home indicator / nav bar. */}
        <View
          style={[
            styles.sheet,
            { paddingBottom: SHEET_BOTTOM_PADDING + (keyboardHeight > 0 ? keyboardHeight : insets.bottom) },
          ]}
        >
          <Text style={styles.title}>EDIT PROFILE</Text>

          <ScrollView
            style={{ maxHeight: formMaxHeight }}
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.fieldLabel}>SKATE NAME</Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : undefined]}
              value={name}
              onChangeText={(t) => {
                setName(t);
                setNameError(null);
              }}
              placeholder="e.g. GrindKing99"
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
              returnKeyType="done"
              accessibilityLabel="Skate name"
            />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

            <Text style={[styles.fieldLabel, styles.fieldGap]}>SKILL LEVEL</Text>
            <View style={styles.chipRow} accessibilityRole="radiogroup" accessibilityLabel="Skill level">
              {SKILL_LEVELS.map((level) => (
                <OptionChip
                  key={level.id}
                  label={level.id.toUpperCase()}
                  accessibilityLabel={level.label}
                  selected={skill === level.id}
                  color={C.secondary}
                  onColor={C.onSecondary}
                  role="radio"
                  onPress={() => setSkill(skill === level.id ? null : level.id)}
                />
              ))}
            </View>

            <Text style={[styles.fieldLabel, styles.fieldGap]}>DISCIPLINES</Text>
            <View style={styles.chipRow}>
              {DISCIPLINES.map((d) => (
                <OptionChip
                  key={d.id}
                  label={d.id.toUpperCase()}
                  accessibilityLabel={d.label}
                  selected={disciplines.includes(d.id)}
                  color={C.primary}
                  onColor={C.onPrimary}
                  role="checkbox"
                  onPress={() => toggleDiscipline(d.id)}
                />
              ))}
            </View>

            <Text style={[styles.fieldLabel, styles.fieldGap]}>YOUR LABELS</Text>
            <TapeLabelInput value={labels} onChange={setLabels} />

            <Text style={[styles.fieldLabel, styles.fieldGap]}>PREVIEW</Text>
            <ProfileBadges
              skillLevel={skill}
              disciplines={disciplines}
              pronouns={profile?.pronouns ?? null}
              labels={labels}
              onRemoveLabel={(index) => setLabels((prev) => prev.filter((_, i) => i !== index))}
              wrap
            />
            {labels.length > 0 && <Text style={styles.hint}>TAP ONE OF YOUR LABELS TO REMOVE IT</Text>}
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.75}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, isUpdating && styles.saveBtnBusy]}
              onPress={handleSave}
              disabled={isUpdating}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Save profile"
            >
              {isUpdating ? (
                <ActivityIndicator color={C.onPrimary} size="small" />
              ) : (
                <Text style={styles.saveText}>SAVE</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type OptionChipProps = {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  color: string;
  onColor: string;
  role: "radio" | "checkbox";
  onPress: () => void;
};

// One pickable option: the outline chip, or the tape once picked (same
// look as the badge it becomes on the profile).
function OptionChip({ label, accessibilityLabel, selected, color, onColor, role, onPress }: OptionChipProps) {
  return (
    <TapeChip
      text={label}
      colors={{ bg: color, fg: onColor }}
      active={selected}
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
