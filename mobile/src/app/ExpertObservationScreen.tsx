import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Pressable,
  StatusBar,
} from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const GREEN = '#008236';

// ─────────────────────────────────────────────────────────────────────────────
// Question definitions
// ─────────────────────────────────────────────────────────────────────────────

// Questions 1–3: rendered before Anomaly Flags
const QUESTIONS_BEFORE_ANOMALY = [
  {
    id: 'spreadingPattern',
    label: '1. Spreading Pattern Texture',
    options: [
      'Smooth and Continuous',
      'Ragged and Fragmented',
      'Partial Spreading Only',
      'No Spreading',
    ],
  },
  {
    id: 'grainTranslucency',
    label: '2. Grain Translucency',
    options: ['Fully Translucent', 'Partially Translucent', 'Opaque'],
  },
  {
    id: 'scoreUniformity',
    label: '3. Within-dish Score Uniformity',
    options: ['Uniform', 'Moderate Variation', 'High Variation'],
  },
] as const;

// Question 5: rendered after Anomaly Flags
const QUESTIONS_AFTER_ANOMALY = [
  {
    id: 'kohSolution',
    label: '5. KOH Solution Appearance',
    options: ['Clear', 'Mildly Clouded', 'Heavily Clouded'],
  },
] as const;

// Combined — used only for type inference and isComplete check
const SINGLE_SELECT_QUESTIONS = [
  ...QUESTIONS_BEFORE_ANOMALY,
  ...QUESTIONS_AFTER_ANOMALY,
] as const;

const ANOMALY_OPTIONS = [
  'Longitudinal Cracking',
  'Unilateral Spreading',
  'Floating Grains',
  'No Anomaly',
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SingleSelectId = typeof SINGLE_SELECT_QUESTIONS[number]['id'];

type Answers = {
  [K in SingleSelectId]: string | null;
} & {
  anomalyFlags: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function RadioOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionBtn, selected && styles.optionBtnSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CheckboxOption({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionBtn, checked && styles.optionBtnSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.checkboxOuter, checked && styles.checkboxOuterSelected]}>
        {checked && <Text style={styles.checkboxTick}>✓</Text>}
      </View>
      <Text style={[styles.optionText, checked && styles.optionTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Image Preview Modal
// ─────────────────────────────────────────────────────────────────────────────

function ImagePreviewModal({
  visible,
  imageUri,
  sampleId,
  onClose,
}: {
  visible: boolean;
  imageUri: string;
  sampleId: string;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={() => {}}>

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Submitted Image</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>Sample {sampleId}</Text>

          {/* Full Image */}
          <Image
            source={{ uri: imageUri }}
            style={styles.modalImage}
            resizeMode="contain"
          />

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ExpertObservationScreen({ navigation, route }: any) {
  const {
    imageUri,
    sampleId,
    variety,
    grainCount,
    session,
  } = route.params;

  // ── State ──────────────────────────────────────────────────────────────────

  const [answers, setAnswers] = useState<Answers>({
    spreadingPattern: null,
    grainTranslucency: null,
    scoreUniformity: null,
    kohSolution: null,
    anomalyFlags: [],
  });

  const [imageModalVisible, setImageModalVisible] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function selectSingle(id: SingleSelectId, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function toggleAnomaly(option: string) {
    setAnswers((prev) => {
      const flags = prev.anomalyFlags;

      // "No Anomaly" is mutually exclusive with everything else
      if (option === 'No Anomaly') {
        return {
          ...prev,
          anomalyFlags: flags.includes('No Anomaly') ? [] : ['No Anomaly'],
        };
      }

      // Selecting another option clears "No Anomaly"
      const withoutNone = flags.filter((f) => f !== 'No Anomaly');
      const alreadySelected = withoutNone.includes(option);

      return {
        ...prev,
        anomalyFlags: alreadySelected
          ? withoutNone.filter((f) => f !== option)
          : [...withoutNone, option],
      };
    });
  }

  // All single-select questions answered + at least one anomaly flag chosen
  const isComplete =
    SINGLE_SELECT_QUESTIONS.every((q) => answers[q.id] !== null) &&
    answers.anomalyFlags.length > 0;

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSaveAndDraft() {
    navigation.navigate('AIDraft', {
      imageUri,
      sampleId,
      variety,
      grainCount,
      session,
      answers,
    });
  }

  function handleSaveManually() {
    navigation.navigate('ManualScore', {
      imageUri,
      sampleId,
      variety,
      grainCount,
      session,
      answers,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expert Observation</Text>
          <TouchableOpacity style={styles.headerRefBtn}>
            {/* <Text style={styles.headerRefIcon}>📖</Text> */}
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Sample {sampleId}</Text>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerText}>
            <Text style={styles.infoBannerLine1}>
              {sampleId} • {variety} • {grainCount} grains
            </Text>
            <Text style={styles.infoBannerLine2}>Session: {session}</Text>
          </View>

          {/* Tappable captured image thumbnail */}
          <TouchableOpacity
            style={styles.thumbnailContainer}
            onPress={() => setImageModalVisible(true)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <View style={styles.thumbnailOverlay}>
              <Text style={styles.thumbnailOverlayIcon}>⛶</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ASV REFERENCE LIBRARY */}
        <TouchableOpacity style={styles.libraryBtn} onPress={() => navigation.navigate('ReferenceLibrary')}>
          <Text style={styles.libraryText}>
            📖 ASV Reference Library
          </Text>
        </TouchableOpacity>

        {/* ── QUESTIONS 1–3 ── */}
        {QUESTIONS_BEFORE_ANOMALY.map((question) => (
          <SectionCard key={question.id}>
            <Text style={styles.sectionLabel}>{question.label}</Text>
            <View style={styles.optionsList}>
              {question.options.map((option) => (
                <RadioOption
                  key={option}
                  label={option}
                  selected={answers[question.id] === option}
                  onPress={() => selectSingle(question.id, option)}
                />
              ))}
            </View>
          </SectionCard>
        ))}

        {/* ── QUESTION 4: ANOMALY FLAGS (multi-select) ── */}
        <SectionCard>
          <Text style={styles.sectionLabel}>4. Anomaly Flags</Text>
          <Text style={styles.sectionHint}>Select all that apply</Text>
          <View style={styles.optionsList}>
            {ANOMALY_OPTIONS.map((option) => (
              <CheckboxOption
                key={option}
                label={option}
                checked={answers.anomalyFlags.includes(option)}
                onPress={() => toggleAnomaly(option)}
              />
            ))}
          </View>
        </SectionCard>

        {/* ── QUESTION 5 ── */}
        {QUESTIONS_AFTER_ANOMALY.map((question) => (
          <SectionCard key={question.id}>
            <Text style={styles.sectionLabel}>{question.label}</Text>
            <View style={styles.optionsList}>
              {question.options.map((option) => (
                <RadioOption
                  key={option}
                  label={option}
                  selected={answers[question.id] === option}
                  onPress={() => selectSingle(question.id, option)}
                />
              ))}
            </View>
          </SectionCard>
        ))}

        <View style={{ height: 8 }} />

      </ScrollView>

      {/* ── FOOTER ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, !isComplete && styles.primaryBtnDisabled]}
          onPress={handleSaveAndDraft}
          disabled={!isComplete}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>✦  Save and Request AI Draft</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, !isComplete && styles.secondaryBtnDisabled]}
          onPress={handleSaveManually}
          disabled={!isComplete}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryBtnText, !isComplete && styles.secondaryBtnTextDisabled]}>
            Save and Score Manually
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── IMAGE PREVIEW MODAL ── */}
      <ImagePreviewModal
        visible={imageModalVisible}
        imageUri={imageUri}
        sampleId={sampleId}
        onClose={() => setImageModalVisible(false)}
      />

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: GREEN,
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  backArrow: {
    color: '#FFFFFF',
    fontSize: 24,
    marginRight: 12,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },

  headerRefBtn: {
    padding: 4,
  },

  headerRefIcon: {
    fontSize: 20,
  },

  headerSubtitle: {
    color: '#E5E7EB',
    fontSize: 14,
    marginBottom: 12,
  },

  // ── Info Banner ──────────────────────────────────────────────────────────────
  infoBanner: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  infoBannerText: {
    flex: 1,
    marginRight: 12,
  },

  infoBannerLine1: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.9,
  },

  infoBannerLine2: {
    color: '#DCFCE7',
    fontSize: 12,
    marginTop: 3,
    opacity: 0.8,
  },

  // ── Thumbnail ────────────────────────────────────────────────────────────────
  thumbnailContainer: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },

  thumbnail: {
    width: '100%',
    height: '100%',
  },

  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  thumbnailOverlayIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 140,
    gap: 14,
  },

  // ── ASV Row ──────────────────────────────────────────────────────────────────
  asvRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  asvText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Section Card ─────────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },

  sectionHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: -10,
    marginBottom: 12,
  },

  optionsList: {
    gap: 10,
  },

  // ── Option Button (shared base) ──────────────────────────────────────────────
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },

  optionBtnSelected: {
    borderColor: GREEN,
    backgroundColor: '#F0FFF4',
  },

  optionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },

  optionTextSelected: {
    color: '#166534',
    fontWeight: '600',
  },

  // ── Radio ────────────────────────────────────────────────────────────────────
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioOuterSelected: {
    borderColor: GREEN,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GREEN,
  },

  // ── Checkbox ─────────────────────────────────────────────────────────────────
  checkboxOuter: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  checkboxOuterSelected: {
    borderColor: GREEN,
    backgroundColor: GREEN,
  },

  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },

  primaryBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },

  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },

  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryBtnDisabled: {},

  secondaryBtnText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },

  secondaryBtnTextDisabled: {
    color: '#9CA3AF',
  },

  // ── Image Preview Modal ───────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    width: '100%',
    maxWidth: 400,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCloseText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },

  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
  },

  modalImage: {
    width: '100%',
    height: 340,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },

    // ASV LIBRARY BUTTON
  libraryBtn: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },

  libraryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1D4ED8",
  },
});