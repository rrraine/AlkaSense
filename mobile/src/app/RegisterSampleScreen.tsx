import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const GREEN = '#008236';

const RICE_VARIETIES = [
  'NSIC Rc 222',
  'NSIC Rc 160',
  'PSB Rc 18',
  'PSB Rc 82',
  'IR64',
  'IR72',
];

type RegisteredSample = {
  id: string;
  variety: string;
  grainCount: string;
  registeredAt: string;
};

const MOCK_REGISTERED: RegisteredSample[] = [
  { id: 'S001', variety: 'NSIC Rc 222', grainCount: '10', registeredAt: '14:30' },
  { id: 'S002', variety: 'PSB Rc 18',   grainCount: '10', registeredAt: '14:25' },
];

export default function RegisterSampleScreen({ navigation, route }: any) {
  const sessionId   = route?.params?.sessionId ?? 'ALKA-2026-041';
  const batchId     = route?.params?.batchId   ?? 'PR-2026-041';
  const kohConc     = route?.params?.kohConc    ?? '1.7';
  const duration    = route?.params?.duration   ?? '23';
  const temperature = route?.params?.temperature ?? '30';

  const [sampleId,          setSampleId]          = useState('');
  const [variety,           setVariety]            = useState('');
  const [grainCount,        setGrainCount]         = useState('');
  const [showDropdown,      setShowDropdown]       = useState(false);
  const [errors,            setErrors]             = useState<Record<string, string>>({});
  const [registeredSamples, setRegisteredSamples]  = useState<RegisteredSample[]>(MOCK_REGISTERED);

  function getNextSampleId() {
    const next = registeredSamples.length + 1;
    return `S${String(next).padStart(3, '0')}`;
  }

  function handleRegister() {
    const newErrors: Record<string, string> = {};

    if (!sampleId.trim())   newErrors.sampleId   = 'Sample identifier is required.';
    if (!variety)           newErrors.variety     = 'Please select a rice variety.';
    if (!grainCount.trim()) newErrors.grainCount  = 'Grain count is required.';
    else if (isNaN(Number(grainCount)) || Number(grainCount) <= 0)
      newErrors.grainCount = 'Enter a valid grain count.';

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      const now   = new Date();
      const time  = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      setRegisteredSamples(prev => [
        { id: sampleId, variety, grainCount, registeredAt: time },
        ...prev,
      ]);

      setSampleId('');
      setVariety('');
      setGrainCount('');
      setErrors({});
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.root}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Register Sample</Text>
            <Text style={styles.headerSubtitle}>Session {sessionId}</Text>
          </View>
        </View>

        {/* TREATMENT BANNER */}
        <View style={styles.treatmentBanner}>
          <Text style={styles.treatmentLabel}>Session Treatment</Text>
          <Text style={styles.treatmentValue}>
            KOH {kohConc}% • {duration}h @ {temperature}°C • Batch {batchId}
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* NEW SAMPLE FORM CARD */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New Sample</Text>

            {/* SAMPLE IDENTIFIER */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Sample Identifier <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, !!errors.sampleId && styles.inputError]}
                placeholder={`e.g., ${getNextSampleId()}`}
                placeholderTextColor="#9CA3AF"
                value={sampleId}
                onChangeText={setSampleId}
                autoCapitalize="characters"
              />
              {!!errors.sampleId && (
                <Text style={styles.errorText}>{errors.sampleId}</Text>
              )}
            </View>

            {/* RICE VARIETY DROPDOWN */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Rice Variety <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.dropdown, !!errors.variety && styles.inputError]}
                onPress={() => setShowDropdown(prev => !prev)}
                activeOpacity={0.8}
              >
                <Text style={variety ? styles.dropdownSelected : styles.dropdownPlaceholder}>
                  {variety || 'Select variety'}
                </Text>
                <Text style={styles.dropdownChevron}>{showDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showDropdown && (
                <View style={styles.dropdownList}>
                  {RICE_VARIETIES.map((v, i) => (
                    <TouchableOpacity
                      key={v}
                      style={[
                        styles.dropdownItem,
                        i === RICE_VARIETIES.length - 1 && styles.dropdownItemLast,
                      ]}
                      onPress={() => { setVariety(v); setShowDropdown(false); }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        variety === v && styles.dropdownItemActive,
                      ]}>
                        {v}
                      </Text>
                      {variety === v && <Text style={styles.dropdownItemCheck}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {!!errors.variety && (
                <Text style={styles.errorText}>{errors.variety}</Text>
              )}
            </View>

            {/* GRAIN COUNT */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Grain Count <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, !!errors.grainCount && styles.inputError]}
                placeholder="e.g., 10"
                placeholderTextColor="#9CA3AF"
                value={grainCount}
                onChangeText={setGrainCount}
                keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              />
              {!!errors.grainCount && (
                <Text style={styles.errorText}>{errors.grainCount}</Text>
              )}
            </View>

            {/* REGISTER BUTTON */}
            <TouchableOpacity
              style={styles.registerBtn}
              onPress={handleRegister}
              activeOpacity={0.8}
            >
              <Text style={styles.registerBtnText}>Register Sample</Text>
            </TouchableOpacity>
          </View>

          {/* REGISTERED SAMPLES LIST */}
          <Text style={styles.sectionTitle}>
            Registered Samples ({registeredSamples.length})
          </Text>

          {registeredSamples.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No samples registered yet.</Text>
            </View>
          ) : (
            registeredSamples.map((sample) => (
              <TouchableOpacity key={sample.id} style={styles.sampleCard} activeOpacity={0.7}>
                <View style={styles.sampleIconWrap}>
                  <Text style={styles.sampleIconCheck}>✓</Text>
                </View>
                <View style={styles.sampleInfo}>
                  <Text style={styles.sampleId}>{sample.id}</Text>
                  <Text style={styles.sampleMeta}>
                    {sample.variety} • {sample.grainCount} grains
                  </Text>
                  <Text style={styles.sampleTime}>Registered at {sample.registeredAt}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))
          )}

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.proceedBtn}
            onPress={() => navigation?.navigate('ImageCapture')}
            activeOpacity={0.85}
          >
            <Text style={styles.proceedBtnText}>Proceed to Image Capture  →</Text>
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

  // Header
  header: {
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 26,
    paddingHorizontal: 16,
    gap: 12,
  },
  backButton: {
    padding: 4,
    marginRight: 4,
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 1,
  },

  // Treatment Banner
  treatmentBanner: {
    backgroundColor: '#FFF8E8',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  treatmentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  treatmentValue: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '500',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },

  // Fields
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
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
    color: '#111827',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },

  // Dropdown
  dropdown: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  dropdownSelected: {
    fontSize: 15,
    color: '#111827',
  },
  dropdownChevron: {
    fontSize: 10,
    color: '#6B7280',
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownItemActive: {
    color: GREEN,
    fontWeight: '600',
  },
  dropdownItemCheck: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '700',
  },

  // Register button (outlined style)
  registerBtn: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#FAFAFA',
  },
  registerBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  // Section title
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  // Empty state
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // Sample card (registered list)
  sampleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sampleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sampleIconCheck: {
    color: GREEN,
    fontSize: 16,
    fontWeight: '700',
  },
  sampleInfo: {
    flex: 1,
  },
  sampleId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  sampleMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  sampleTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  chevron: {
    fontSize: 22,
    color: '#9CA3AF',
    fontWeight: '300',
    marginLeft: 8,
  },

  // Footer
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
  proceedBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#006228',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  proceedBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});