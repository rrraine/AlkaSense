import React, { useMemo, useState } from 'react';
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
  {
    id: 'S001',
    variety: 'NSIC Rc 222',
    grainCount: '10',
    registeredAt: '14:30',
  },
  {
    id: 'S002',
    variety: 'PSB Rc 18',
    grainCount: '10',
    registeredAt: '14:25',
  },
];

export default function RegisterSampleScreen({
  navigation,
  route,
}: any) {
  const sessionId =
    route?.params?.sessionId ?? 'ALKA-2026-041';

  const batchId =
    route?.params?.batchId ?? 'PR-2026-041';

  const kohConc =
    route?.params?.kohConc ?? '1.7';

  const duration =
    route?.params?.duration ?? '23';

  const temperature =
    route?.params?.temperature ?? '30';

  const [sampleId, setSampleId] = useState('');
  const [variety, setVariety] = useState('');
  const [grainCount, setGrainCount] =
    useState('');

  const [showDropdown, setShowDropdown] =
    useState(false);

  const [errors, setErrors] = useState<
    Record<string, string>
  >({});

  const [registeredSamples, setRegisteredSamples] =
    useState<RegisteredSample[]>(
      MOCK_REGISTERED
    );

  // SELECTED SAMPLE
  const [selectedSampleId, setSelectedSampleId] =
    useState<string | null>(null);

  const nextSampleId = useMemo(() => {
    const next = registeredSamples.length + 1;

    return `S${String(next).padStart(3, '0')}`;
  }, [registeredSamples]);

  function validateForm() {
    const newErrors: Record<string, string> =
      {};

    if (!sampleId.trim()) {
      newErrors.sampleId =
        'Sample identifier is required.';
    }

    if (!variety.trim()) {
      newErrors.variety =
        'Please select a rice variety.';
    }

    if (!grainCount.trim()) {
      newErrors.grainCount =
        'Grain count is required.';
    } else if (
      isNaN(Number(grainCount)) ||
      Number(grainCount) <= 0
    ) {
      newErrors.grainCount =
        'Enter a valid grain count.';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  function handleRegister() {
    const isValid = validateForm();

    if (!isValid) return;

    const now = new Date();

    const registeredAt = `${String(
      now.getHours()
    ).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newSample: RegisteredSample = {
      id: sampleId,
      variety,
      grainCount,
      registeredAt,
    };

    setRegisteredSamples(prev => [
      newSample,
      ...prev,
    ]);

    // RESET FORM
    setSampleId('');
    setVariety('');
    setGrainCount('');
    setErrors({});
    setShowDropdown(false);
  }

  // MUST SELECT A REGISTERED SAMPLE
  const canProceed = !!selectedSampleId;

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
    >
      <View style={styles.root}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              navigation?.goBack()
            }
          >
            <Text style={styles.backArrow}>
              ←
            </Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>
              Register Sample
            </Text>

            <Text style={styles.headerSubtitle}>
              Session {sessionId}
            </Text>
          </View>
        </View>

        {/* SESSION BANNER */}
        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>
            Session Treatment
          </Text>

          <Text style={styles.bannerValue}>
            KOH {kohConc}% • {duration}h @{' '}
            {temperature}°C • Batch {batchId}
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* FORM CARD */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              New Sample
            </Text>

            {/* SAMPLE ID */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Sample Identifier{' '}
                <Text style={styles.required}>
                  *
                </Text>
              </Text>

              <TextInput
                style={[
                  styles.input,
                  errors.sampleId &&
                    styles.inputError,
                ]}
                placeholder={`e.g., ${nextSampleId}`}
                placeholderTextColor="#9CA3AF"
                value={sampleId}
                onChangeText={setSampleId}
                autoCapitalize="characters"
              />

              {!!errors.sampleId && (
                <Text style={styles.errorText}>
                  {errors.sampleId}
                </Text>
              )}
            </View>

            {/* VARIETY */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Rice Variety{' '}
                <Text style={styles.required}>
                  *
                </Text>
              </Text>

              <TouchableOpacity
                style={[
                  styles.dropdown,
                  errors.variety &&
                    styles.inputError,
                ]}
                activeOpacity={0.8}
                onPress={() =>
                  setShowDropdown(prev => !prev)
                }
              >
                <Text
                  style={
                    variety
                      ? styles.dropdownText
                      : styles.dropdownPlaceholder
                  }
                >
                  {variety || 'Select variety'}
                </Text>

                <Text style={styles.chevron}>
                  {showDropdown ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showDropdown && (
                <View style={styles.dropdownList}>
                  {RICE_VARIETIES.map(
                    (item, index) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.dropdownItem,
                          index ===
                            RICE_VARIETIES.length -
                              1 &&
                            styles.dropdownItemLast,
                        ]}
                        onPress={() => {
                          setVariety(item);
                          setShowDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            variety === item &&
                              styles.dropdownItemActive,
                          ]}
                        >
                          {item}
                        </Text>

                        {variety === item && (
                          <Text
                            style={
                              styles.dropdownCheck
                            }
                          >
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>
                    )
                  )}
                </View>
              )}

              {!!errors.variety && (
                <Text style={styles.errorText}>
                  {errors.variety}
                </Text>
              )}
            </View>

            {/* GRAIN COUNT */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Grain Count{' '}
                <Text style={styles.required}>
                  *
                </Text>
              </Text>

              <TextInput
                style={[
                  styles.input,
                  errors.grainCount &&
                    styles.inputError,
                ]}
                placeholder="e.g., 10"
                placeholderTextColor="#9CA3AF"
                keyboardType={
                  Platform.OS === 'ios'
                    ? 'number-pad'
                    : 'numeric'
                }
                value={grainCount}
                onChangeText={setGrainCount}
              />

              {!!errors.grainCount && (
                <Text style={styles.errorText}>
                  {errors.grainCount}
                </Text>
              )}
            </View>

            {/* REGISTER BUTTON */}
            <TouchableOpacity
              style={styles.registerButton}
              activeOpacity={0.85}
              onPress={handleRegister}
            >
              <Text
                style={styles.registerButtonText}
              >
                Register Sample
              </Text>
            </TouchableOpacity>
          </View>

          {/* REGISTERED LIST */}
          <Text style={styles.sectionTitle}>
            Select Registered Sample
          </Text>

          <View style={styles.sampleList}>
            {registeredSamples.map(sample => {
              const isSelected =
                selectedSampleId === sample.id;

              return (
                <TouchableOpacity
                  key={sample.id}
                  activeOpacity={0.8}
                  style={[
                    styles.sampleRow,
                    isSelected &&
                      styles.sampleRowSelected,
                  ]}
                  onPress={() =>
                    setSelectedSampleId(
                      sample.id
                    )
                  }
                >
                  <View
                    style={[
                      styles.radioOuter,
                      isSelected &&
                        styles.radioOuterActive,
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={styles.radioInner}
                      />
                    )}
                  </View>

                  <View style={styles.sampleInfo}>
                    <Text style={styles.sampleId}>
                      {sample.id}
                    </Text>

                    <Text style={styles.sampleMeta}>
                      {sample.variety} •{' '}
                      {sample.grainCount} grains
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.proceedButton,
              !canProceed &&
                styles.proceedButtonDisabled,
            ]}
            disabled={!canProceed}
            activeOpacity={0.85}
            onPress={() =>
              navigation?.navigate(
                'ImageCapture',
                {
                  selectedSampleId,
                }
              )
            }
          >
            <Text
              style={styles.proceedButtonText}
            >
              Proceed to Image Capture →
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },

  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  header: {
    backgroundColor: GREEN,
    paddingTop: 54,
    paddingBottom: 24,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    marginRight: 12,
    padding: 4,
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
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontSize: 13,
  },

  banner: {
    backgroundColor: '#FFF8E8',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  bannerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    textTransform: 'uppercase',
    marginBottom: 2,
  },

  bannerValue: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '500',
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },

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
    borderColor: '#EF4444',
  },

  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },

  dropdown: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dropdownPlaceholder: {
    fontSize: 15,
    color: '#9CA3AF',
  },

  dropdownText: {
    fontSize: 15,
    color: '#111827',
  },

  chevron: {
    fontSize: 10,
    color: '#6B7280',
  },

  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontWeight: '700',
  },

  dropdownCheck: {
    color: GREEN,
    fontWeight: '700',
  },

  registerButton: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },

  registerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  sampleList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  sampleRowSelected: {
    backgroundColor: '#F0FDF4',
  },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  radioOuterActive: {
    borderColor: GREEN,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GREEN,
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
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 14,
  },

  proceedButton: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },

  proceedButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },

  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});