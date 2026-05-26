import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../core/firebase";
import { apiClient } from "../api/client";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TextInput,
  TouchableOpacity,
} from "react-native";

// ─── Password validation helpers ─────────────────────────────────────────────
console.log("API URL:", process.env.EXPO_PUBLIC_API_URL);

function validateEmail(email: string): string {
  if (!email.trim()) return "Email is required.";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) return "Enter a valid email address.";
  return "";
}

function validatePassword(password: string): string {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return "";
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [firebaseError, setFirebaseError] = useState("");

  // Inline validation on blur
  function handleEmailBlur() {
    const msg = validateEmail(email);
    setErrors((prev) => ({ ...prev, email: msg }));
  }

  function handlePasswordBlur() {
    const msg = validatePassword(password);
    setErrors((prev) => ({ ...prev, password: msg }));
  }

   async function handleSignIn() {
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    const newErrors: Record<string, string> = {};
    if (emailErr) newErrors.email = emailErr;
    if (passErr) newErrors.password = passErr;

    setErrors(newErrors);
    setFirebaseError("");

    if (Object.keys(newErrors).length > 0) return;

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Soft backend sync — non-fatal if server is unreachable offline
      apiClient.get('/auth/me').catch(() => {});
      // Auth state change drives the stack switch — no manual navigate needed
    } catch (error: any) {
      console.log("Login failed:", error.message);
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        setFirebaseError("Incorrect email or password. Please try again.");
      } else if (error.code === "auth/too-many-requests") {
        setFirebaseError("Too many attempts. Please try again later.");
      } else {
        setFirebaseError("Sign in failed. Please try again.");
      }
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Image
            source={require("../../assets/logo2.png")}
            style={styles.logo}
          />
          <Text style={styles.title}>AlkaSense</Text>
          <Text style={styles.subtitle}>AI-Assisted Rice Grain Evaluation</Text>
          <Text style={styles.tagline}>Philippine Rice Research Institute</Text>
        </View>

        {/* FORM */}
        <View style={styles.form}>
          {/* FIREBASE ERROR */}
          {!!firebaseError && (
            <View style={styles.firebaseErrorBox}>
              <Text style={styles.firebaseErrorText}>{firebaseError}</Text>
            </View>
          )}

          {/* EMAIL */}
          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, !!errors.email && styles.inputError]}
              placeholder="evaluator@philrice.gov.ph"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (errors.email) setErrors((p) => ({ ...p, email: "" }));
              }}
              onBlur={handleEmailBlur}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {!!errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* PASSWORD */}
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View
              style={[
                styles.passwordRow,
                !!errors.password && styles.inputError,
              ]}
            >
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (errors.password) setErrors((p) => ({ ...p, password: "" }));
                }}
                onBlur={handlePasswordBlur}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <Text style={styles.show}>{showPassword ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>
            {!!errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* FORGOT PASSWORD */}
          <TouchableOpacity>
            <Text style={styles.forgot}>Forgot password?</Text>
          </TouchableOpacity>

          {/* SIGN IN BUTTON */}
          <TouchableOpacity style={styles.button} onPress={handleSignIn}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>

          {/* SIGN UP */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account?{" "}</Text>
            <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F4F6" },
  container: { padding: 16, paddingTop: 100 },
  header: { alignItems: "center", marginBottom: 30 },
  logo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
    marginBottom: 10,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  title: { fontSize: 28, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280" },
  tagline: { marginTop: 6, fontSize: 12, color: "#6B7280" },
  form: { marginTop: 10 },
  firebaseErrorBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  firebaseErrorText: { fontSize: 13, color: "#DC2626", fontWeight: "500" },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, color: "#111827" },
  input: {
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputError: { borderWidth: 1, borderColor: "#e53e3e" },
  errorText: { fontSize: 12, color: "#e53e3e", marginTop: 4 },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: "#111827" },
  show: { color: "#00A63E", fontWeight: "600", fontSize: 13 },
  forgot: {
    textAlign: "left",
    color: "#00A63E",
    marginBottom: 16,
    fontSize: 13,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#008236",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  signupRow: { flexDirection: "row", justifyContent: "center", marginTop: 35 },
  signupText: { fontSize: 13, color: "#6B7280" },
  signupLink: { fontSize: 13, color: "#00A63E", fontWeight: "700" },
});