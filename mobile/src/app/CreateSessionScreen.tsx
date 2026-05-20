import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSessionStore } from '../store/sessionStore';
import { validateBatchMetadata } from '../validators/BatchMetadataValidator';
import { SessionRepository } from '../db/repositories/SessionRepository';
import { initDatabase } from '../db/database';

const sessionRepo = new SessionRepository();

export default function CreateSessionScreen() {
  const { form, setForm, resetForm, setActiveSession } = useSessionStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleStartSession() {
    // 1. Validate
    const result = validateBatchMetadata(form);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      // 2. Init DB
      await initDatabase();

      // 3. Get evaluator ID from secure store
      let evaluatorId = await SecureStore.getItemAsync('evaluator_id');
      if (!evaluatorId) {
        evaluatorId = `evaluator-${Date.now()}`;
        await SecureStore.setItemAsync('evaluator_id', evaluatorId);
      }

      // 4. Write to SQLite via SessionRepository
      const session = await sessionRepo.create(
        evaluatorId,
        form.location,
        form.notes
      );

      // 5. Set active session in Zustand
      setActiveSession(session.id);

      Alert.alert(
        'Session Started',
        `Session ID: ${session.id.slice(0, 8)}...\nLocation: ${form.location}`,
        [{ text: 'OK' }]
      );

      resetForm();

    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>New Batch Session</Text>
      <Text style={styles.subtitle}>Enter evaluation metadata before capturing samples</Text>

      {/* Evaluator Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Evaluator Name</Text>
        <TextInput
          style={[styles.input, errors.evaluatorName && styles.inputError]}
          placeholder="e.g. Juan dela Cruz"
          value={form.evaluatorName}
          onChangeText={(v) => setForm({ evaluatorName: v })}
        />
        {errors.evaluatorName && (
          <Text style={styles.error}>{errors.evaluatorName}</Text>
        )}
      </View>

      {/* Location */}
      <View style={styles.field}>
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={[styles.input, errors.location && styles.inputError]}
          placeholder="e.g. PhilRice Field Lab B"
          value={form.location}
          onChangeText={(v) => setForm({ location: v })}
        />
        {errors.location && (
          <Text style={styles.error}>{errors.location}</Text>
        )}
      </View>

      {/* Rice Variety */}
      <View style={styles.field}>
        <Text style={styles.label}>Rice Variety</Text>
        <TextInput
          style={[styles.input, errors.riceVariety && styles.inputError]}
          placeholder="e.g. NSIC Rc222"
          value={form.riceVariety}
          onChangeText={(v) => setForm({ riceVariety: v })}
        />
        {errors.riceVariety && (
          <Text style={styles.error}>{errors.riceVariety}</Text>
        )}
      </View>

      {/* Notes */}
      <View style={styles.field}>
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Any additional observations..."
          value={form.notes}
          onChangeText={(v) => setForm({ notes: v })}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleStartSession}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Start Session</Text>
        }
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#888', marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: '#444', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 14, color: '#1a1a1a', backgroundColor: '#fafafa'
  },
  inputError: { borderColor: '#e53e3e' },
  textarea: { height: 80, textAlignVertical: 'top' },
  error: { fontSize: 12, color: '#e53e3e', marginTop: 4 },
  button: {
    backgroundColor: '#1D9E75', borderRadius: 8,
    padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 40
  },
  buttonDisabled: { backgroundColor: '#9FE1CB' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});