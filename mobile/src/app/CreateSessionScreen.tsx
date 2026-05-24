import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import { createSession, getActiveSession, SessionError } from '../services/SessionService';
import { getUserById } from '../db/repositories/UserRepository';
import type { User } from '../db/repositories/UserRepository';
import { auth } from '../core/firebase';

const GREEN = '#008236';

// ─────────────────────────────────────────────────────────────────────────────

export default function CreateSessionScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  const [menuVisible, setMenuVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDateOverridden, setIsDateOverridden] = useState(false);

  // Evaluator profile loaded from SQLite
  const [evaluator, setEvaluator] = useState<User | null>(null);

  // FR-M1-10: checked on mount
  const [isRegisterBlocked, setIsRegisterBlocked] = useState(false);

  const [form, setForm] = useState({
    sessionName: '',
    batchIdentifier: '',
    kohConcentration: '',
    incubationDuration: '',
    incubationTemperature: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── On mount: load evaluator + check for active session ─────────────────

  useEffect(() => {
    async function init() {
      try {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          const user = await getUserById(firebaseUser.uid);
          setEvaluator(user);
        }

        const active = await getActiveSession(firebaseUser?.uid ?? '');
        setIsRegisterBlocked(active !== null);
      } catch (err) {
        console.error('CreateSessionScreen init error:', err);
      } finally {
        setInitLoading(false);
      }
    }
    init();
  }, []);

  // ─── Field helpers ────────────────────────────────────────────────────────

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  // FR-M1-08: all required fields must be filled before the button enables
  const allFieldsFilled =
    form.sessionName.trim() !== '' &&
    form.batchIdentifier.trim() !== '' &&
    form.kohConcentration.trim() !== '' &&
    form.incubationDuration.trim() !== '' &&
    form.incubationTemperature.trim() !== '';

  // ─── Submit ───────────────────────────────────────────────────────────────

  async function handleStartSession() {
    const newErrors: Record<string, string> = {};

    // Basic empty-field guards (belt-and-suspenders with the disabled button)
    if (!form.sessionName.trim())
      newErrors.sessionName = 'Session name is required.';
    if (!form.batchIdentifier.trim())
      newErrors.batchIdentifier = 'Batch identifier is required.';
    if (!form.kohConcentration.trim())
      newErrors.kohConcentration = 'KOH concentration is required.';
    if (!form.incubationDuration.trim())
      newErrors.incubationDuration = 'Incubation duration is required.';
    if (!form.incubationTemperature.trim())
      newErrors.incubationTemperature = 'Incubation temperature is required.';

    // Numeric range guards
    const koh = parseFloat(form.kohConcentration);
    if (!isNaN(koh) && (koh <= 0 || koh > 100))
      newErrors.kohConcentration = 'KOH concentration must be between 0 and 100.';

    const duration = parseFloat(form.incubationDuration);
    if (!isNaN(duration) && duration <= 0)
      newErrors.incubationDuration = 'Incubation duration must be greater than 0.';

    const temp = parseFloat(form.incubationTemperature);
    if (!isNaN(temp) && (temp < 0 || temp > 100))
      newErrors.incubationTemperature = 'Temperature must be between 0 °C and 100 °C.';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const session = await createSession({
        evaluator_id: evaluator?.id ?? auth.currentUser?.uid ?? '',
        name: form.sessionName.trim(),
        batch_identifier: form.batchIdentifier.trim(),
        koh_concentration: koh,
        incubation_duration: duration,
        incubation_temp: temp,
        // Only send evaluation_date when the user manually overrode it
        ...(isDateOverridden ? { evaluation_date: selectedDate.toISOString() } : {}),
      });

      // FR-M1-09: auto-navigate to Sample Registration after session is created
      navigation?.navigate('RegisterSample', {
        sessionId: session.id,
        sessionName: session.name,
        batchIdentifier: session.batch_identifier,
        kohConcentration: session.koh_concentration,
        incubationDuration: session.incubation_duration,
        incubationTemperature: session.incubation_temp,
        evaluationDate: session.evaluation_date,
      });

      // Reset form
      setForm({
        sessionName: '',
        batchIdentifier: '',
        kohConcentration: '',
        incubationDuration: '',
        incubationTemperature: '',
      });
      setSelectedDate(new Date());
      setIsDateOverridden(false);

    } catch (err) {
      if (err instanceof SessionError) {
        if (err.field === 'activeSession') {
          setIsRegisterBlocked(true);
        } else if (err.field) {
          // Surface uniqueness errors on the relevant field
          setErrors((prev) => ({ ...prev, [err.field!]: err.message }));
        } else {
          setErrors((prev) => ({ ...prev, sessionName: err.message }));
        }
      } else {
        console.error('Unexpected error creating session:', err);
        setErrors((prev) => ({
          ...prev,
          sessionName: 'Something went wrong. Please try again.',
        }));
      }
    } finally {
      setLoading(false);
    }
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  if (initLoading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={GREEN} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.root}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Session</Text>
          <TouchableOpacity
            style={styles.hamburger}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>
        </View>

        {/* FR-M1-10: Active session warning banner */}
        {isRegisterBlocked && (
          <View style={styles.activeBanner}>
            <Text style={styles.activeBannerText}>
              ⚠ An active session already exists. Close it before creating a new one.
            </Text>
          </View>
        )}

        {/* BODY */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* PROFILE CARD */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Image
                source={require('../../assets/personIcon.png')}
                style={styles.avatarImage}
              />
            </View>
            <View>
              <Text style={styles.profileName}>
                {evaluator?.name ?? 'Evaluator'}
              </Text>
              <Text style={styles.profileRole}>
                {evaluator
                  ? `${evaluator.role} • ${evaluator.institution}`
                  : 'PhilRice'}
              </Text>
            </View>
          </View>

          {/* SESSION INFORMATION */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Session Information</Text>

            {/* Session Name */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Session Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, !!errors.sessionName && styles.inputError]}
                placeholder="e.g., Spring Harvest 2026"
                placeholderTextColor="#9CA3AF"
                value={form.sessionName}
                onChangeText={(v) => updateField('sessionName', v)}
              />
              {!!errors.sessionName && (
                <Text style={styles.errorText}>{errors.sessionName}</Text>
              )}
            </View>

            {/* Batch Identifier */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Batch Identifier <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, !!errors.batchIdentifier && styles.inputError]}
                placeholder="e.g., PR-2026-041"
                placeholderTextColor="#9CA3AF"
                value={form.batchIdentifier}
                onChangeText={(v) => updateField('batchIdentifier', v)}
              />
              {!!errors.batchIdentifier && (
                <Text style={styles.errorText}>{errors.batchIdentifier}</Text>
              )}
            </View>

            {/* Evaluation Date */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Evaluation Date
                {isDateOverridden && (
                  <Text style={styles.overrideBadge}> (Manual Override)</Text>
                )}
              </Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {selectedDate.toLocaleDateString('en-US')}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_event, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) {
                      setSelectedDate(date);
                      setIsDateOverridden(true);
                    }
                  }}
                />
              )}
            </View>
          </View>

          {/* TREATMENT PARAMETERS */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Treatment Parameters</Text>
            <Text style={styles.cardSubtitle}>
              IRRI Standard Protocol — adjust only if deviating from protocol.
            </Text>

            {/* KOH Concentration */}
            <View style={styles.field}>
              <Text style={styles.label}>
                KOH Concentration (%) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, !!errors.kohConcentration && styles.inputError]}
                placeholder="e.g., 1.7"
                placeholderTextColor="#9CA3AF"
                value={form.kohConcentration}
                onChangeText={(v) => updateField('kohConcentration', v)}
                keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              />
              {!!errors.kohConcentration && (
                <Text style={styles.errorText}>{errors.kohConcentration}</Text>
              )}
            </View>

            {/* Incubation Duration */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Incubation Duration (hrs) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, !!errors.incubationDuration && styles.inputError]}
                placeholder="e.g., 23"
                placeholderTextColor="#9CA3AF"
                value={form.incubationDuration}
                onChangeText={(v) => updateField('incubationDuration', v)}
                keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              />
              {!!errors.incubationDuration && (
                <Text style={styles.errorText}>{errors.incubationDuration}</Text>
              )}
            </View>

            {/* Incubation Temperature */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Incubation Temperature (°C) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, !!errors.incubationTemperature && styles.inputError]}
                placeholder="e.g., 30"
                placeholderTextColor="#9CA3AF"
                value={form.incubationTemperature}
                onChangeText={(v) => updateField('incubationTemperature', v)}
                keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              />
              {!!errors.incubationTemperature && (
                <Text style={styles.errorText}>{errors.incubationTemperature}</Text>
              )}
            </View>
          </View>

          <View style={{ height: 200 }} />
        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.startButton,
              (!allFieldsFilled || isRegisterBlocked) && styles.startButtonDisabled,
            ]}
            onPress={handleStartSession}
            disabled={!allFieldsFilled || isRegisterBlocked || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.startButtonText}>Start Session</Text>
            )}
          </TouchableOpacity>

          {isRegisterBlocked && (
            <Text style={styles.disabledHint}>
              Close the current active session to create a new one.
            </Text>
          )}
          {!isRegisterBlocked && !allFieldsFilled && (
            <Text style={styles.disabledHint}>
              Fill in all required fields to continue.
            </Text>
          )}
        </View>
      </View>

      {/* ─── FR-M1-02: Hamburg Menu Modal ─────────────────────────────────── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>Session Options</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setShowDatePicker(true);
              }}
            >
              <Text style={styles.menuItemIcon}>📅</Text>
              <View style={styles.menuItemBody}>
                <Text style={styles.menuItemTitle}>
                  Evaluation Date Manual Override
                </Text>
                <Text style={styles.menuItemSubtitle}>
                  Backdate the evaluation date for this session.{'\n'}
                  <Text style={styles.menuItemNote}>
                    (Actual override is pending implementation)
                  </Text>
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCancel}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  backButton: { marginRight: 12 },
  backArrow: { color: '#FFFFFF', fontSize: 24 },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  hamburger: { padding: 4 },
  hamburgerIcon: { color: '#FFFFFF', fontSize: 22 },

  activeBanner: {
    backgroundColor: '#FFF8E8',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  activeBannerText: { fontSize: 13, color: '#92400E', fontWeight: '500' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },

  profileCard: {
    backgroundColor: '#E8F5EC',
    borderWidth: 1,
    borderColor: '#B7E4C7',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: { width: 22, height: 22, resizeMode: 'contain' },
  profileName: { fontSize: 16, fontWeight: '700' },
  profileRole: { fontSize: 13, color: '#6B7280' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  cardSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 10 },

  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  required: { color: '#DC2626' },
  overrideBadge: { color: '#B45309', fontWeight: '600', fontSize: 11 },

  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  dateText: { fontSize: 15, color: '#111827' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  startButton: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonDisabled: { backgroundColor: '#9CA3AF', opacity: 0.7 },
  startButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disabledHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 18,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuItemIcon: { fontSize: 22, marginTop: 2 },
  menuItemBody: { flex: 1 },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  menuItemSubtitle: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  menuItemNote: { fontSize: 11, color: '#B45309', fontStyle: 'italic' },
  menuCancel: {
    marginTop: 4,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
  },
  menuCancelText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
});