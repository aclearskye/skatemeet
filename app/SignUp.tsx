import createUser from "@/lib/auth/createUser";
import { useAuthContext } from "@/lib/context/use-auth-context";
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignUp = () => {
  const router = useRouter();
  const { refreshProfile } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await createUser(email, password);
      if (result.needsEmailConfirmation) {
        setEmailSent(true);
      } else {
        await refreshProfile();
      }
    } catch (e: any) {
      setError(e.message || "Error creating account");
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={styles.confirmContainer}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>SK</Text>
          </View>
          <Text style={styles.heading}>CHECK YOUR INBOX</Text>
          <Text style={styles.confirmText}>
            We've sent a confirmation link to{"\n"}
            <Text style={{ color: C.primary }}>{email}</Text>
          </Text>
          <Text style={styles.confirmHint}>
            Open the link in that email to activate your account, then come back
            and sign in.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/Login")}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>GO TO SIGN IN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>

          <View style={styles.titleRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>SK</Text>
            </View>
            <View>
              <Text style={styles.heading}>JOIN SK8:MEET</Text>
              <Text style={styles.subheading}>Create your account</Text>
            </View>
          </View>

          <View style={styles.card}>
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

            <View style={[styles.field, emailFocused && styles.fieldFocused]}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={emailFocused ? C.primary : C.muted}
                style={styles.fieldIcon}
              />
              <TextInput
                style={[styles.fieldInput, { flex: 1 }]}
                placeholder="Email"
                placeholderTextColor={C.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            <View style={[styles.field, passwordFocused && styles.fieldFocused]}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={passwordFocused ? C.primary : C.muted}
                style={styles.fieldIcon}
              />
              <TextInput
                style={[styles.fieldInput, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor={C.muted}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={C.muted}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.field, confirmFocused && styles.fieldFocused]}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={confirmFocused ? C.primary : C.muted}
                style={styles.fieldIcon}
              />
              <TextInput
                style={[styles.fieldInput, { flex: 1 }]}
                placeholder="Confirm password"
                placeholderTextColor={C.muted}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
              />
            </View>

            <Text style={styles.hint}>
              You'll set up your skate profile right after this.
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.55 }]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? "CREATING ACCOUNT…" : "CREATE ACCOUNT"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/Login")}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 48,
  },
  back: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 32,
    marginBottom: 28,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: R,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.primaryBright,
  },
  logoMarkText: {
    color: C.onPrimary,
    fontFamily: F.heading,
    fontSize: 20,
    letterSpacing: 2,
  },
  heading: {
    color: C.text,
    fontFamily: F.heading,
    fontSize: 24,
    letterSpacing: 2,
  },
  subheading: {
    color: C.muted,
    fontFamily: F.monoRegular,
    fontSize: 11,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: C.surfaceLow,
    borderRadius: R,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
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
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    paddingHorizontal: 4,
    marginBottom: 20,
    height: 52,
  },
  fieldFocused: {
    borderBottomColor: C.primary,
  },
  fieldIcon: {
    marginRight: 10,
  },
  fieldInput: {
    flex: 1,
    color: C.text,
    fontFamily: F.body,
    fontSize: 16,
  },
  hint: {
    color: C.muted,
    fontFamily: F.monoRegular,
    fontSize: 11,
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: R,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: C.onPrimary,
    fontFamily: F.mono,
    fontSize: 14,
    letterSpacing: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    color: C.muted,
    fontFamily: F.body,
    fontSize: 14,
  },
  footerLink: {
    color: C.primary,
    fontFamily: F.bodyBold,
    fontSize: 14,
  },
  confirmContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  confirmText: {
    color: C.text,
    fontFamily: F.body,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  confirmHint: {
    color: C.muted,
    fontFamily: F.body,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});
