import { useState } from 'react';
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
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';

const GREEN = '#00A63E';

export default function CreateSessionScreen() {
  const [loading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [form, setForm] = useState({
    sessionName: '',
    batchIdentifier: '',
    kohConcentration: '',
    incubationDuration: '',
    incubationTemperature: '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleStartSession() {
    console.log('Session Started');

    setForm({
      sessionName: '',
      batchIdentifier: '',
      kohConcentration: '',
      incubationDuration: '',
      incubationTemperature: '',
    });

    setSelectedDate(new Date());
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.root}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Create New Session
          </Text>
        </View>

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
                Evaluator Name
              </Text>
              <Text style={styles.profileRole}>
                Role • PhilRice
              </Text>
            </View>
          </View>

          {/* SESSION INFORMATION */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Session Information
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>
                Session Name <Text style={styles.required}>*</Text>
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g., Spring Harvest 2026"
                placeholderTextColor="#9CA3AF"
                value={form.sessionName}
                onChangeText={(v) =>
                  updateField('sessionName', v)
                }
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Batch Identifier <Text style={styles.required}>*</Text>
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g., PR-2026-041"
                placeholderTextColor="#9CA3AF"
                value={form.batchIdentifier}
                onChangeText={(v) =>
                  updateField('batchIdentifier', v)
                }
              />
            </View>

            {/* DATE */}
            <View style={styles.field}>
              <Text style={styles.label}>Evaluation Date</Text>

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
                  display={
                    Platform.OS === 'ios' ? 'spinner' : 'default'
                  }
                  onChange={(_, date?: Date) => {
                    setShowDatePicker(false);
                    if (date) setSelectedDate(date);
                  }}
                />
              )}
            </View>
          </View>

          {/* TREATMENT PARAMETERS */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Treatment Parameters
            </Text>

            <Text style={styles.cardSubtitle}>
              Following IRRI Standard Protocol
            </Text>

            <View style={styles.row}>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>
                  KOH Concentration (%)
                </Text>

                <TextInput
                  style={styles.input}
                  value={form.kohConcentration}
                  onChangeText={(v) =>
                    updateField('kohConcentration', v)
                  }
                  keyboardType={
                    Platform.OS === 'ios'
                      ? 'decimal-pad'
                      : 'numeric'
                  }
                />
              </View>

              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>
                  Duration (hours)
                </Text>

                <TextInput
                  style={styles.input}
                  value={form.incubationDuration}
                  onChangeText={(v) =>
                    updateField('incubationDuration', v)
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Incubation Temperature (°C)
              </Text>

              <TextInput
                style={styles.input}
                value={form.incubationTemperature}
                onChangeText={(v) =>
                  updateField('incubationTemperature', v)
                }
                keyboardType={
                  Platform.OS === 'ios'
                    ? 'decimal-pad'
                    : 'numeric'
                }
              />
            </View>
          </View>

          {/* extra space so keyboard + footer won't block UI */}
          <View style={{ height: 200 }} />
        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartSession}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.startButtonText}>
                Start Session
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  header: {
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },

  backButton: {
    marginRight: 12,
  },

  backArrow: {
    color: '#FFFFFF',
    fontSize: 24,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },

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

  avatarImage: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },

  profileName: {
    fontSize: 16,
    fontWeight: '700',
  },

  profileRole: {
    fontSize: 13,
    color: '#6B7280',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },

  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
  },

  field: {
    marginBottom: 14,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  halfField: {
    flex: 1,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },

  required: {
    color: '#DC2626',
  },

  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },

  dateText: {
    fontSize: 15,
    color: '#111827',
  },

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

  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});