import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { onSignOutButtonPress } from "@/lib/auth/onSignOutButtonPress";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useDevAccountSettings } from "@/lib/devTools/hooks/useDevAccountSettings";
import { useSwitchAccount } from "@/lib/devTools/hooks/useSwitchAccount";
import { SEEDED_DEV_ACCOUNTS } from "@/lib/devTools/types";
import { C } from "@/lib/theme";
import { styles } from "./DevAccountSwitcher.styles";

// Dev builds only (mounted behind __DEV__ in app/_layout.tsx). A floating
// DEV button that signs in as any seeded test account
// (scripts/seed-dev-accounts.mjs) or a login added by hand.
export function DevAccountSwitcher() {
  const insets = useSafeAreaInsets();
  const { session, profile, isBanned } = useAuthContext();
  const { settings, setSharedPassword, addCustomAccount, removeCustomAccount } = useDevAccountSettings();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const close = useCallback(() => setOpen(false), []);
  const { switchTo, pendingEmail, error } = useSwitchAccount(close);

  if (hidden) return null;

  const currentEmail = session?.user.email?.toLowerCase() ?? null;
  const shared = settings.sharedPassword;

  const saveCustom = () => {
    const email = customEmail.trim().toLowerCase();
    if (!email) return;
    addCustomAccount({ email, password: customPassword || null });
    setCustomEmail("");
    setCustomPassword("");
  };

  const status = !session
    ? "Signed out"
    : [
        profile?.account_type ?? "no profile",
        profile?.is_admin && "admin",
        profile && !profile.onboarding_completed && "not onboarded",
        profile?.account_type === "user" && !profile.age_confirmed_at && "no age check",
        isBanned && "banned",
      ]
        .filter(Boolean)
        .join(" · ");

  return (
    <>
      <TouchableOpacity
        style={[styles.pill, { bottom: insets.bottom + 72 }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        accessibilityLabel="Open the dev account switcher"
      >
        <Text style={styles.pillText}>DEV</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.backdrop} onPress={close} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>DEV ACCOUNTS</Text>
              <TouchableOpacity onPress={close} hitSlop={12}>
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.currentBox}>
              <Text style={styles.currentEmail} numberOfLines={1}>{currentEmail ?? "—"}</Text>
              <Text style={styles.currentStatus}>{status}</Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {shared ? (
                <View style={styles.passwordSaved}>
                  <Text style={styles.muted}>Seeded password saved on this device</Text>
                  <TouchableOpacity onPress={() => setSharedPassword(null)}>
                    <Text style={styles.link}>CHANGE</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={passwordDraft}
                    onChangeText={setPasswordDraft}
                    placeholder="DEV_ACCOUNT_PASSWORD"
                    placeholderTextColor={C.muted}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => {
                      if (!passwordDraft) return;
                      setSharedPassword(passwordDraft);
                      setPasswordDraft("");
                    }}
                  >
                    <Text style={styles.smallBtnText}>SAVE</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.sectionLabel}>SEEDED</Text>
              {SEEDED_DEV_ACCOUNTS.map((account) => (
                <AccountRow
                  key={account.key}
                  title={account.label}
                  subtitle={account.blurb}
                  email={account.email}
                  isCurrent={account.email === currentEmail}
                  isPending={pendingEmail === account.email}
                  disabled={!shared || pendingEmail !== null}
                  onPress={() => shared && switchTo(account.email, shared)}
                />
              ))}

              <Text style={styles.sectionLabel}>CUSTOM</Text>
              {settings.customAccounts.map((account) => {
                const password = account.password ?? shared;
                return (
                  <AccountRow
                    key={account.email}
                    title={account.email}
                    subtitle={account.password ? "Own password" : "Uses the seeded password"}
                    email={account.email}
                    isCurrent={account.email === currentEmail}
                    isPending={pendingEmail === account.email}
                    disabled={!password || pendingEmail !== null}
                    onPress={() => password && switchTo(account.email, password)}
                    onRemove={() => removeCustomAccount(account.email)}
                  />
                );
              })}
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={customEmail}
                  onChangeText={setCustomEmail}
                  placeholder="email"
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.input}
                  value={customPassword}
                  onChangeText={setCustomPassword}
                  placeholder="password (optional)"
                  placeholderTextColor={C.muted}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.smallBtn} onPress={saveCustom}>
                  <Text style={styles.smallBtnText}>ADD</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.footerRow}>
              {session ? (
                <TouchableOpacity
                  style={styles.footerBtn}
                  onPress={() => {
                    close();
                    onSignOutButtonPress();
                  }}
                >
                  <Text style={styles.footerBtnText}>SIGN OUT</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.footerBtn}
                onPress={() => {
                  close();
                  setHidden(true);
                }}
              >
                <Text style={styles.footerBtnText}>HIDE UNTIL RELOAD</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

type AccountRowProps = {
  title: string;
  subtitle: string;
  email: string;
  isCurrent: boolean;
  isPending: boolean;
  disabled: boolean;
  onPress: () => void;
  onRemove?: () => void;
};

function AccountRow({ title, subtitle, email, isCurrent, isPending, disabled, onPress, onRemove }: AccountRowProps) {
  return (
    <TouchableOpacity
      style={[styles.row, isCurrent && styles.rowCurrent, disabled && !isPending && styles.rowDisabled]}
      onPress={onPress}
      disabled={disabled || isCurrent}
      activeOpacity={0.7}
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, isCurrent && styles.rowTitleCurrent]} numberOfLines={1}>
          {title}{isCurrent ? "  ·  SIGNED IN" : ""}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={2}>{subtitle}</Text>
        {title !== email ? <Text style={styles.rowEmail}>{email}</Text> : null}
      </View>
      {isPending ? <ActivityIndicator color={C.primary} /> : null}
      {onRemove && !isPending ? (
        <TouchableOpacity onPress={onRemove} hitSlop={10}>
          <Ionicons name="trash-outline" size={18} color={C.muted} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}
