import { useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "@/lib/shared/keyboard";
import type { TapeColors } from "@/lib/shared/tapeLabels";
import { isValidBirthDate, PHONE_REGEX, type TicketWaiverForm, type WaiverSignature } from "@/lib/tickets/waiverTypes";
import { C } from "@/lib/theme";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { StoreTextField } from "@/components/storeAccount/StoreTextField";
import { styles } from "./WaiverSheet.styles";

type Props = {
  // Null hides the sheet.
  form: TicketWaiverForm | null;
  storeName: string;
  ticketName: string;
  accent: TapeColors;
  isBusy: boolean;
  // A server error from the checkout call.
  error: string | null;
  onSubmit: (signature: WaiverSignature) => void;
  onClose: () => void;
};

// The store's waiver, signed before paying: the waiver text, the skater's
// details and an emergency contact, a typed signature and an "I agree"
// tick. Their details fill in only if they saved them for this store's
// current waiver version.
export function WaiverSheet({ form, ...props }: Props) {
  return (
    <Modal visible={form != null} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onClose}>
      {/* Keyed so each opening starts from the buyer's saved details. */}
      {form ? <WaiverBody key={`${form.version}`} form={form} {...props} /> : null}
    </Modal>
  );
}

function WaiverBody({ form, storeName, ticketName, accent, isBusy, error, onSubmit, onClose }: Props & { form: TicketWaiverForm }) {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState(form.prefill?.fullName ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(form.prefill?.dateOfBirth ?? "");
  const [emergencyName, setEmergencyName] = useState(form.prefill?.emergencyName ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(form.prefill?.emergencyPhone ?? "");
  const [signedName, setSignedName] = useState("");
  const [agreed, setAgreed] = useState(false);
  // On if they saved last time; otherwise off, so nothing is kept unasked.
  const [saveDetails, setSaveDetails] = useState(form.prefill != null);
  const [problem, setProblem] = useState<string | null>(null);

  const handleSubmit = () => {
    const check = (): string | null => {
      if (fullName.trim().length < 2) return "Enter your full name.";
      if (!isValidBirthDate(dateOfBirth.trim())) return "Enter your date of birth as YYYY-MM-DD.";
      if (emergencyName.trim().length < 2) return "Enter an emergency contact's name.";
      if (!PHONE_REGEX.test(emergencyPhone.trim())) return "Enter your emergency contact's phone number.";
      if (signedName.trim().length < 2) return "Type your full name to sign.";
      if (!agreed) return "Tick the box to agree to the waiver.";
      return null;
    };
    const issue = check();
    setProblem(issue);
    if (issue) return;
    onSubmit({
      version: form.version,
      full_name: fullName.trim(),
      date_of_birth: dateOfBirth.trim(),
      emergency_name: emergencyName.trim(),
      emergency_phone: emergencyPhone.trim(),
      signed_name: signedName.trim(),
      agreed: true,
      save_details: saveDetails,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top > 0 ? 8 : 16 }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.heading}>WAIVER</Text>
          <Text style={styles.subheading} numberOfLines={1}>
            {`// ${storeName} · ${ticketName}`}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={C.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          {storeName} asks everyone to sign this before skating. It&apos;s saved with your ticket and shown to staff
          when you check in.
        </Text>
        <View style={styles.waiverBox}>
          <Text style={styles.waiverVersion}>VERSION {form.version}</Text>
          <ScrollView style={styles.waiverScroll} nestedScrollEnabled>
            <Text style={styles.waiverText}>{form.body}</Text>
          </ScrollView>
        </View>

        <Text style={styles.section}>YOUR DETAILS</Text>
        {form.prefill ? (
          <Text style={styles.prefilled}>Filled in from last time. Type your name and tick to sign.</Text>
        ) : null}
        <StoreTextField label="FULL NAME" value={fullName} onChangeText={setFullName} maxLength={120} autoComplete="name" />
        <StoreTextField
          label="DATE OF BIRTH"
          hint="YYYY-MM-DD"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          maxLength={10}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={styles.section}>EMERGENCY CONTACT</Text>
        <StoreTextField label="NAME" value={emergencyName} onChangeText={setEmergencyName} maxLength={120} />
        <StoreTextField
          label="PHONE"
          value={emergencyPhone}
          onChangeText={setEmergencyPhone}
          maxLength={30}
          keyboardType="phone-pad"
        />

        <Text style={styles.section}>SIGN</Text>
        <StoreTextField
          label="TYPE YOUR FULL NAME"
          hint="This is your signature."
          value={signedName}
          onChangeText={setSignedName}
          maxLength={120}
        />
        <TouchableOpacity
          style={styles.agree}
          onPress={() => setAgreed((v) => !v)}
          activeOpacity={0.8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
        >
          <View style={[styles.box, agreed && { backgroundColor: accent.bg, borderColor: accent.bg }]}>
            {agreed ? <Ionicons name="checkmark" size={16} color={accent.fg} /> : null}
          </View>
          <Text style={styles.agreeText}>I&apos;ve read and agree to {storeName}&apos;s waiver.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.agree}
          onPress={() => setSaveDetails((v) => !v)}
          activeOpacity={0.8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: saveDetails }}
        >
          <View style={[styles.box, saveDetails && { backgroundColor: accent.bg, borderColor: accent.bg }]}>
            {saveDetails ? <Ionicons name="checkmark" size={16} color={accent.fg} /> : null}
          </View>
          <Text style={styles.saveText}>
            Save my details for next time at {storeName}. You&apos;ll still sign each time, and fill it in again if
            they change their waiver.
          </Text>
        </TouchableOpacity>

        {problem || error ? <Text style={styles.error}>{problem ?? error}</Text> : null}
        <StorePrimaryButton label="SIGN AND PAY" onPress={handleSubmit} isBusy={isBusy} />
      </KeyboardAwareScrollView>
    </View>
  );
}
