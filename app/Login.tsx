import { DiscordSignIn } from "@/lib/auth/DiscordSignIn";
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

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Enter your email and password");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (authError) setError(authError.message);
  };

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
          <View style={styles.brand}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>SK</Text>
            </View>
            <Text style={styles.appName}>SK8:MEET</Text>
            <Text style={styles.tagline}>Find your crew. Find your spot.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>WELCOME BACK</Text>

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

            <View
              style={[
                styles.field,
                emailFocused && styles.fieldFocused,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={emailFocused ? C.primary : C.muted}
                style={styles.fieldIcon}
              />
              <TextInput
                style={styles.fieldInput}
                placeholder="Email"
                placeholderTextColor={C.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            <View
              style={[
                styles.field,
                passwordFocused && styles.fieldFocused,
              ]}
            >
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

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.55 }]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? "SIGNING IN…" : "SIGN IN"}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.discordBtn}
              onPress={DiscordSignIn}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-discord" size={20} color="#fff" />
              <Text style={styles.discordBtnText}>CONTINUE WITH DISCORD</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New here? </Text>
            <TouchableOpacity onPress={() => router.push("/SignUp")}>
              <Text style={styles.footerLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 48,
  },
  brand: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: R,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: C.primaryBright,
  },
  logoMarkText: {
    color: C.onPrimary,
    fontFamily: F.heading,
    fontSize: 24,
    letterSpacing: 2,
  },
  appName: {
    color: C.text,
    fontFamily: F.heading,
    fontSize: 32,
    letterSpacing: 4,
  },
  tagline: {
    color: C.muted,
    fontFamily: F.monoRegular,
    fontSize: 11,
    marginTop: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: C.surfaceLow,
    borderRadius: R,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  heading: {
    color: C.text,
    fontFamily: F.heading,
    fontSize: 24,
    letterSpacing: 2,
    marginBottom: 20,
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
  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: R,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    color: C.onPrimary,
    fontFamily: F.mono,
    fontSize: 14,
    letterSpacing: 2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    color: C.muted,
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 2,
  },
  discordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.discord,
    borderRadius: R,
    height: 52,
    borderWidth: 2,
    borderColor: "#4752c4",
  },
  discordBtnText: {
    color: "#fff",
    fontFamily: F.mono,
    fontSize: 12,
    letterSpacing: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
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
});
