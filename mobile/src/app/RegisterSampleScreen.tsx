import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SampleService } from '../services/SampleService';
import { getSessionById } from '../services/SessionService';
import type { Sample, RiceVariety } from '../db/repositories/SampleRepository';

const GREEN = '#008236';
const RICE_VARIETIES: RiceVariety[] = ['NSIC Rc 222', 'NSIC Rc 160', 'PSB Rc 18', 'PSB Rc 82', 'IR64', 'IR72'];
const sampleService = new SampleService();

export default function RegisterSampleScreen({ navigation, route }: any) {
  const sessionId: string = route?.params?.sessionId;
  const sessionName: string = route?.params?.sessionName ?? '';
  const batchIdentifier: string = route?.params?.batchIdentifier ?? '';
  const kohConcentration: string = String(route?.params?.kohConcentration ?? '');
  const incubationDuration: string = String(route?.params?.incubationDuration ?? '');
  const incubationTemperature: string = String(route?.params?.incubationTemperature ?? '');

  const [nextIdentifier, setNextIdentifier] = useState<string>('0000');
  const [variety, setVariety] = useState('');
  const [grainCount, setGrainCount] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [registeredSamples, setRegisteredSamples] = useState<Sample[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        setLoading(true);
        try {
          const [samples, next] = await Promise.all([
            sampleService.getSamplesBySession(sessionId),
            sampleService.getNextSampleIdentifier(sessionId),
          ]);
          if (!cancelled) {
            setRegisteredSamples(samples);
            setNextIdentifier(next);
          }
        } catch (err) {
          console.error('RegisterSampleScreen load error:', err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return () => { cancelled = true; };
    }, [sessionId])
  );

  const allFieldsFilled = variety.trim() !== '' && grainCount.trim() !== '';

  function validateForm() {
    const newErrors: Record<string, string> = {};
    if (!variety.trim()) {
      newErrors.variety = 'Please select a rice variety.';
    }
    if (!grainCount.trim()) {
      newErrors.grainCount = 'Grain count is required.';
    } else if (isNaN(Number(grainCount)) || Number(grainCount) <= 0) {
      newErrors.grainCount = 'Grain count must be greater than 0.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleRegister() {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const newSample = await sampleService.registerSample({
        session_id: sessionId,
        grain_count: Number(grainCount),
        rice_variety: variety as RiceVariety,
      });
      setRegisteredSamples((prev) => [newSample, ...prev]);
      const next = await sampleService.getNextSampleIdentifier(sessionId);
      setNextIdentifier(next);
      setVariety('');
      setGrainCount('');
      setErrors({});
      setShowDropdown(false);
    } catch (err: any) {
      setErrors({ form: err.message ?? 'Failed to register sample.' });
    } finally {
      setSubmitting(false);
    }
  }

  const canProceed = !!selectedSampleId;
  const selectedSample = registeredSamples.find((s) => s.id === selectedSampleId);

  return (
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.root}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Register Sample</Text>
            <Text style={styles.headerSubtitle}>{sessionName}</Text>
          </View>
        </View>

        {/* SESSION BANNER */}
        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>Session Treatment</Text>
          <Text style={styles.bannerValue}>
            KOH {kohConcentration}% · {incubationDuration}h @ {incubationTemperature}°C · Batch {batchIdentifier}
          </Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* FORM CARD */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New Sample</Text>

            {/* SAMPLE IDENTIFIER — READ ONLY */}
            <View style={styles.field}>
              <Text style={styles.label}>Sample Identifier</Text>
              <View style={styles.inputReadOnly}>
                <Text style={styles.inputReadOnlyText}>{nextIdentifier}</Text>
                <View style={styles.inputReadOnlyBadge}>
                  <Text style={styles.inputReadOnlyBadgeText}>Auto</Text>
                </View>
              </View>
            </View>

            {/* RICE VARIETY */}
            <View style={styles.field}>
              <Text style={styles.label}>Rice Variety <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={[styles.dropdown, errors.variety && styles.inputError]}
                activeOpacity={0.8}
                onPress={() => setShowDropdown((prev) => !prev)}
              >
                <Text style={variety ? styles.dropdownText : styles.dropdownPlaceholder}>
                  {variety || 'Select variety'}
                </Text>
                <Text style={styles.chevron}>{showDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showDropdown && (
                <View style={styles.dropdownList}>
                  {RICE_VARIETIES.map((item, index) => (
                    <TouchableOpacity
                      key={item}
                      style={[styles.dropdownItem, index === RICE_VARIETIES.length - 1 && styles.dropdownItemLast]}
                      onPress={() => { setVariety(item); setShowDropdown(false); if (errors.variety) setErrors((p) => ({ ...p, variety: '' })); }}
                    >
                      <Text style={[styles.dropdownItemText, variety === item && styles.dropdownItemActive]}>{item}</Text>
                      {variety === item && <Text style={styles.dropdownCheck}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {!!errors.variety && <Text style={styles.errorText}>{errors.variety}</Text>}
            </View>

            {/* GRAIN COUNT */}
            <View style={styles.field}>
              <Text style={styles.label}>Grain Count <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.grainCount && styles.inputError]}
                placeholder="e.g., 10"
                placeholderTextColor="#9CA3AF"
                keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                value={grainCount}
                onChangeText={(v) => { setGrainCount(v); if (errors.grainCount) setErrors((p) => ({ ...p, grainCount: '' })); }}
              />
              {!!errors.grainCount && <Text style={styles.errorText}>{errors.grainCount}</Text>}
            </View>

            {!!errors.form && <Text style={styles.errorText}>{errors.form}</Text>}

            <TouchableOpacity
              style={[styles.registerButton, (!allFieldsFilled || submitting) && styles.registerButtonDisabled]}
              activeOpacity={0.85}
              onPress={handleRegister}
              disabled={!allFieldsFilled || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#374151" />
                : <Text style={[styles.registerButtonText, !allFieldsFilled && styles.registerButtonTextDisabled]}>Register Sample</Text>
              }
            </TouchableOpacity>
          </View>

          {/* REGISTERED LIST */}
          <Text style={styles.sectionTitle}>Registered Samples ({registeredSamples.length})</Text>

          {loading ? (
            <ActivityIndicator color={GREEN} style={{ marginTop: 16 }} />
          ) : (
            <View style={styles.sampleList}>
              {registeredSamples.map((sample) => {
                const isSelected = selectedSampleId === sample.id;
                return (
                  <TouchableOpacity
                    key={sample.id}
                    activeOpacity={0.8}
                    style={[styles.sampleRow, isSelected && styles.sampleRowSelected]}
                    onPress={() => setSelectedSampleId(sample.id)}
                  >
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.sampleInfo}>
                      <Text style={styles.sampleIdText}>{sample.sample_identifier}</Text>
                      <Text style={styles.sampleMeta}>{sample.rice_variety} · {sample.grain_count} grains</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.proceedButton, !canProceed && styles.proceedButtonDisabled]}
            disabled={!canProceed}
            activeOpacity={0.85}
            onPress={() => {
              if (!selectedSample) return;
              navigation?.navigate('ImageCapture', {
                sampleId: selectedSample.id,
                sample_identifier: selectedSample.sample_identifier,
                variety: selectedSample.rice_variety,
                grainCount: String(selectedSample.grain_count),
                sessionId,
                session: sessionName,
              });
            }}
          >
            <Text style={styles.proceedButtonText}>Proceed to Image Capture →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: GREEN, paddingTop: 54, paddingBottom: 24, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 12, padding: 4 },
  backArrow: { color: '#FFFFFF', fontSize: 24, fontWeight: '300' },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', marginTop: 2, fontSize: 13 },
  banner: { backgroundColor: '#FFF8E8', borderBottomWidth: 1, borderBottomColor: '#FCD34D', paddingHorizontal: 16, paddingVertical: 10 },
  bannerLabel: { fontSize: 11, fontWeight: '700', color: '#92400E', textTransform: 'uppercase', marginBottom: 2 },
  bannerValue: { fontSize: 13, color: '#B45309', fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 6 },
  required: { color: '#DC2626' },
  input: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#111827', borderWidth: 1, borderColor: 'transparent' },
  inputError: { borderColor: '#EF4444' },
  inputReadOnly: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputReadOnlyText: { fontSize: 15, fontWeight: '700', color: '#374151', letterSpacing: 2 },
  inputReadOnlyBadge: { backgroundColor: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  inputReadOnlyBadgeText: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  dropdown: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownPlaceholder: { fontSize: 15, color: '#9CA3AF' },
  dropdownText: { fontSize: 15, color: '#111827' },
  chevron: { fontSize: 10, color: '#6B7280' },
  dropdownList: { backgroundColor: '#FFFFFF', borderRadius: 10, marginTop: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownItemLast: { borderBottomWidth: 0 },
  dropdownItemText: { fontSize: 14, color: '#374151' },
  dropdownItemActive: { color: GREEN, fontWeight: '700' },
  dropdownCheck: { color: GREEN, fontWeight: '700' },
  registerButton: { backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1.5, borderColor: '#D1D5DB', paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  registerButtonDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB', opacity: 0.6 },
  registerButtonText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  registerButtonTextDisabled: { color: '#9CA3AF' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  sampleList: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  sampleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sampleRowSelected: { backgroundColor: '#F0FDF4' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioOuterActive: { borderColor: GREEN },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN },
  sampleInfo: { flex: 1 },
  sampleIdText: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  sampleMeta: { fontSize: 13, color: '#6B7280' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 14 },
  proceedButton: { backgroundColor: GREEN, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  proceedButtonDisabled: { backgroundColor: '#9CA3AF', opacity: 0.7 },
  proceedButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});