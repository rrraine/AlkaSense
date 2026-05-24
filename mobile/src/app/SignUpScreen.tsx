import React, { useState } from "react";
import { signUpUser } from "../services/UserService";
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

const ROLES = ["Researcher", "Field Evaluator", "Lab Technician", "Administrator"];

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateEmail(email: string): string {
  if (!email.trim()) return "Email is required.";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) return "Enter a valid email address.";
  return "";
}

interface PasswordStrength {
  error: string;
  rules: { label: string; passed: boolean }[];
}

function checkPassword(password: string): PasswordStrength {
  const rules = [
    { label: "At least 8 characters", passed: password.length >= 8 },
    { label: "One uppercase letter (A–Z)", passed: /[A-Z]/.test(password) },
    { label: "One number (0–9)", passed: /[0-9]/.test(password) },
    { label: "One special character (!@#$…)", passed: /[^A-Za-z0-9]/.test(password) },
  ];
  const allPassed = rules.every((r) => r.passed);
  return {
    error: allPassed ? "" : "Password does not meet all requirements.",
    rules,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

function PasswordRuleRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <View style={ruleStyles.row}>
      <Text style={[ruleStyles.icon, passed ? ruleStyles.pass : ruleStyles.fail]}>
        {passed ? "✓" : "✕"}
      </Text>
      <Text style={[ruleStyles.label, passed ? ruleStyles.pass : ruleStyles.fail]}>
        {label}
      </Text>
    </View>
  );
}

const ruleStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  icon: { fontSize: 12, fontWeight: "700" },
  label: { fontSize: 12 },
  pass: { color: "#16A34A" },
  fail: { color: "#9CA3AF" },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function SignUpScreen({ navigation }: any) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [institution, setInstitution] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [firebaseError, setFirebaseError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordStrength = checkPassword(password);

  // ─── Validation ────────────────────────────────────────────────────────────

  function validate(): Record<string, string> {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = "Full name is required.";
    const emailErr = validateEmail(email);
    if (emailErr) newErrors.email = emailErr;
    if (!role) newErrors.role = "Select a role.";
    if (!institution.trim()) newErrors.institution = "Institution is required.";
    if (passwordStrength.error) newErrors.password = passwordStrength.error;
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }
    return newErrors;
  }

  // ─── Handler ───────────────────────────────────────────────────────────────

  async function handleSignUp() {
    const newErrors = validate();
    setErrors(newErrors);
    setFirebaseError("");
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      await signUpUser({ fullName, email, role, institution, password });

      // Reset fields
      setFullName("");
      setEmail("");
      setRole("");
      setInstitution("");
      setPassword("");
      setConfirmPassword("");
      setErrors({});
      setFirebaseError("");

      navigation.reset({ index: 0, routes: [{ name: "Login" }] });

    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        setFirebaseError("An account with this email already exists.");
      } else {
        setFirebaseError("Account creation failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ─── UI ────────────────────────────────────────────────────────────────────

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
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <View style={styles.logo}>
              <Text style={styles.logoText}></Text>
            </View>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join AlkaSense for rice grain evaluation</Text>
        </View>

        {/* FORM */}
        <View style={styles.form}>

          {/* FIREBASE ERROR */}
          {!!firebaseError && (
            <View style={styles.firebaseErrorBox}>
              <Text style={styles.firebaseErrorText}>{firebaseError}</Text>
            </View>
          )}

          {/* FULL NAME */}
          <View style={styles.field}>
            <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              placeholder="Juan Dela Cruz"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={(v) => {
                setFullName(v);
                if (errors.fullName) setErrors((p) => ({ ...p, fullName: "" }));
              }}
              autoCapitalize="words"
            />
            {!!errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>

          {/* EMAIL */}
          <View style={styles.field}>
            <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="evaluator@philrice.gov.ph"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (errors.email) setErrors((p) => ({ ...p, email: "" }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* ROLE DROPDOWN */}
          <View style={styles.field}>
            <Text style={styles.label}>Role <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={[styles.dropdown, errors.role && styles.inputError]}
              onPress={() => setShowRoleDropdown((prev) => !prev)}
            >
              <Text style={role ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                {role || "Select your role"}
              </Text>
              <Text style={styles.dropdownChevron}>{showRoleDropdown ? "∧" : "∨"}</Text>
            </TouchableOpacity>
            {showRoleDropdown && (
              <View style={styles.dropdownList}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setRole(r);
                      setShowRoleDropdown(false);
                      setErrors((p) => ({ ...p, role: "" }));
                    }}
                  >
                    <Text style={[styles.dropdownItemText, role === r && styles.dropdownItemActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {!!errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
          </View>

          {/* INSTITUTION */}
          <View style={styles.field}>
            <Text style={styles.label}>Institution <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.institution && styles.inputError]}
              placeholder="Philippine Rice Research Institute"
              placeholderTextColor="#9CA3AF"
              value={institution}
              onChangeText={(v) => {
                setInstitution(v);
                if (errors.institution) setErrors((p) => ({ ...p, institution: "" }));
              }}
            />
            {!!errors.institution && <Text style={styles.errorText}>{errors.institution}</Text>}
          </View>

          {/* PASSWORD */}
          <View style={styles.field}>
            <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
            <View style={[styles.passwordRow, errors.password && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Create a strong password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (errors.password) setErrors((p) => ({ ...p, password: "" }));
                }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                <Text style={styles.show}>{showPassword ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>
            {(passwordFocused || password.length > 0) && (
              <View style={styles.passwordRulesBox}>
                {passwordStrength.rules.map((rule) => (
                  <PasswordRuleRow key={rule.label} label={rule.label} passed={rule.passed} />
                ))}
              </View>
            )}
            {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* CONFIRM PASSWORD */}
          <View style={styles.field}>
            <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
            <View style={[styles.passwordRow, errors.confirmPassword && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Re-enter your password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: "" }));
                }}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)}>
                <Text style={styles.show}>{showConfirmPassword ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>
            {!!errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* ACCOUNT REVIEW NOTICE */}
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Account Review</Text>
            <Text style={styles.noticeText}>
              New accounts require approval from PhilRice administrators before activation.
            </Text>
          </View>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creating Account..." : "Create Account"}
            </Text>
          </TouchableOpacity>

          {/* SIGN IN */}
          <View style={styles.signinRow}>
            <Text style={styles.signinText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation?.goBack()}>
              <Text style={styles.signinLink}>Sign in</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F4F6" },
  container: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: "flex-start", marginBottom: 24 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: "#111827", fontWeight: "300" },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#008236",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  logoText: { fontSize: 26 },
  title: { fontSize: 26, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  form: { marginTop: 4 },
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
  required: { color: "#e53e3e" },
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
  dropdown: {
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  dropdownPlaceholder: { fontSize: 15, color: "#9CA3AF" },
  dropdownSelected: { fontSize: 15, color: "#111827" },
  dropdownChevron: { fontSize: 12, color: "#6B7280" },
  dropdownList: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemText: { fontSize: 14, color: "#374151" },
  dropdownItemActive: { color: "#008236", fontWeight: "600" },
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
  passwordRulesBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  notice: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  noticeTitle: { fontSize: 13, fontWeight: "700", color: "#1D4ED8", marginBottom: 2 },
  noticeText: { fontSize: 12, color: "#1D4ED8", lineHeight: 18 },
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
  buttonDisabled: {
    backgroundColor: "#6B7280",
    elevation: 0,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  signinRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  signinText: { fontSize: 13, color: "#6B7280" },
  signinLink: { fontSize: 13, color: "#00A63E", fontWeight: "700" },
});