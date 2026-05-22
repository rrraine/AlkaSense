import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../core/firebase";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
} from "react-native";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSignIn() {
  const newErrors: Record<string, string> = {};

  if (!email.trim()) newErrors.email = "Email required.";
  if (!password) newErrors.password = "Password required.";

  setErrors(newErrors);

  if (Object.keys(newErrors).length > 0) return;

  try {
    // 1. Firebase login
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const firebaseUser = userCredential.user;

    const idToken = await firebaseUser.getIdToken();

    // 2. Optional: verify with backend later
    await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    navigation.navigate("Dashboard");
  } catch (error: any) {
    console.log("Login failed:", error.message);
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
          <View style={styles.logo}>
            <Text style={styles.logoText}></Text>
          </View>

          <Text style={styles.title}>AlkaSense</Text>
          <Text style={styles.subtitle}>
            AI-Assisted Rice Grain Evaluation
          </Text>

          <Text style={styles.tagline}>
            Philippine Rice Research Institute
          </Text>
        </View>

        {/* FORM */}
        <View style={styles.form}>

          {/* EMAIL */}
          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, !!errors.email && styles.inputError]}
              placeholder="evaluator@philrice.gov.ph"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* PASSWORD */}
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.passwordRow, !!errors.password && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                <Text style={styles.show}>{showPassword ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>
            {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* FORGOT PASSWORD */}
          <TouchableOpacity>
            <Text style={styles.forgot}>Forgot password?</Text>
          </TouchableOpacity>

          {/* BUTTON */}
          <TouchableOpacity style={styles.button} onPress={handleSignIn}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>

          {/* SIGN UP */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
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
  root: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  container: {
    padding: 16,
    paddingTop: 100,
  },

  header: {
    alignItems: "center",
    marginBottom: 30,
  },

  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#008236",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },

  logoText: {
    fontSize: 38,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7280",
  },

  tagline: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
  },

  form: {
    marginTop: 10,
  },

  field: {
    marginBottom: 14,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    color: "#111827",
  },

  input: {
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },

  inputError: {
    borderWidth: 1,
    borderColor: "#e53e3e",
  },

  errorText: {
    fontSize: 12,
    color: "#e53e3e",
    marginTop: 4,
  },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },

  show: {
    color: "#00A63E",
    fontWeight: "600",
    fontSize: 13,
  },

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

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 35,
  },

  signupText: {
    fontSize: 13,
    color: "#6B7280",
  },

  signupLink: {
    fontSize: 13,
    color: "#00A63E",
    fontWeight: "700",
  },
});