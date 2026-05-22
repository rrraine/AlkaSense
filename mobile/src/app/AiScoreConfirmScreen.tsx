import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const GREEN = '#008236';

// ─── Answers type (mirrors ExpertObservationScreen) ───────────────────────────
type Answers = {
  spreadingPattern:  string | null;
  grainTranslucency: string | null;
  scoreUniformity:   string | null;
  kohSolution:       string | null;
  anomalyFlags:      string[];
};

// Human-readable labels for each observation dimension
const OBS_LABELS: Record<keyof Omit<Answers, 'anomalyFlags'>, string> = {
  spreadingPattern:  'Spreading Pattern Texture',
  grainTranslucency: 'Grain Translucency',
  scoreUniformity:   'Within-dish Score Uniformity',
  kohSolution:       'KOH Solution Appearance',
};

// ─── ASV Scale ────────────────────────────────────────────────────────────────
const ASV_SCALE: { score: number; label: string }[] = [
  { score: 1, label: 'High GT (>74°C)' },
  { score: 2, label: 'High GT (>74°C)' },
  { score: 3, label: 'Intermediate GT (70-74°C)' },
  { score: 4, label: 'Intermediate GT (70-74°C)' },
  { score: 5, label: 'Intermediate GT (70-74°C)' },
  { score: 6, label: 'Low GT (<70°C)' },
  { score: 7, label: 'Low GT (<70°C)' },
];

function getGTLabel(score: number) {
  if (score <= 2) return `High GT (>74°C)`;
  if (score <= 5) return `Intermediate GT (70-74°C)`;
  return `Low GT (<70°C)`;
}

// ─── Warning Banner ───────────────────────────────────────────────────────────
function WarningBanner({
  title,
  children,
  color,
}: {
  title: string;
  children: React.ReactNode;
  color: 'yellow' | 'orange';
}) {
  const bg     = color === 'yellow' ? '#FFFBEB' : '#FFF7ED';
  const border = color === 'yellow' ? '#FCD34D' : '#FDBA74';
  const titleC = color === 'yellow' ? '#92400E' : '#9A3412';
  const textC  = color === 'yellow' ? '#78350F' : '#7C2D12';

  return (
    <View style={[styles.warningBanner, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.warningTitleRow}>
        <Text style={[styles.warningIcon, { color: titleC }]}>⚠</Text>
        <Text style={[styles.warningTitle, { color: titleC }]}>{title}</Text>
      </View>
      <View style={{ marginLeft: 26 }}>
        <Text style={[styles.warningBody, { color: textC }]}>{children}</Text>
      </View>
    </View>
  );
}

// ─── Observation Row ──────────────────────────────────────────────────────────
function ObservationRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.obsRow}>
      <Text style={styles.obsLabel}>{label}</Text>
      <Text style={styles.obsValue}>{value}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AiScoreConfirmation({ navigation, route }: any) {
  const {
    imageUri,
    sampleId         = 'S003',
    variety          = 'NSIC Rc 222',
    grainCount       = '10',
    session          = 'Spring Harvest 2026',
    aiDraftScore     = 5,
    calibratedCertainty = 58,
    hasConfidenceWarning  = true,
    hasObservationConflict = true,
    conflictDimensions = ['Spreading Pattern Texture', 'Grain Translucency'],
  } = route?.params ?? {};

  const [selectedScore, setSelectedScore]         = useState<number | null>(null);
  const [deviationRemark, setDeviationRemark]     = useState('');
  const [conflictRemark, setConflictRemark]       = useState('');

  // Derived booleans
  const hasDeviation      = selectedScore !== null && selectedScore !== aiDraftScore;
  const needsDeviation    = hasDeviation;
  const needsConflict     = hasObservationConflict;

  // Validation
  const isValid =
    selectedScore !== null &&
    (!needsDeviation || deviationRemark.trim().length > 0) &&
    (!needsConflict  || conflictRemark.trim().length > 0);

  // Pulse animation on confirm button when valid
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isValid) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.02, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [isValid]);

  function handleConfirm() {
    if (!isValid) return;
    navigation?.navigate('ScoreConfirmed', {
      imageUri,
      sampleId,
      variety,
      grainCount,
      session,
      aiDraftScore,
      finalScore: selectedScore,
      deviationRemark,
      conflictRemark,
    });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Score Confirmation</Text>
            <View style={{ width: 32 }} />
          </View>

          <Text style={styles.headerSubtitle}>Sample {sampleId}</Text>

          {/* Info banner */}
          <View style={styles.infoBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoBannerLine1}>
                {sampleId} • {variety} • {grainCount} grains
              </Text>
              <Text style={styles.infoBannerLine2}>Session: {session}</Text>
            </View>
            {imageUri && (
              <View style={styles.thumbnailContainer}>
                <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
              </View>
            )}
            {!imageUri && (
              <View style={[styles.thumbnailContainer, styles.thumbnailPlaceholder]}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 20 }}>🌾</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── SCROLL BODY ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── AI DRAFT REFERENCE CARD ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitleIcon}>✦</Text>
              <Text style={styles.cardTitle}>AI Draft Reference</Text>
            </View>

            {/* Score + Certainty */}
            <View style={styles.draftScoreRow}>
              <View>
                <Text style={styles.draftScoreCaption}>Draft ASV Score</Text>
                <Text style={styles.draftScoreValue}>{aiDraftScore}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.certaintyCaption}>Certainty</Text>
                <Text style={styles.certaintyValue}>{calibratedCertainty}%</Text>
              </View>
            </View>

            {/* GT Classification */}
            <View style={styles.gtBox}>
              <Text style={styles.gtCaption}>GT Classification</Text>
              <Text style={styles.gtValue}>{getGTLabel(aiDraftScore)}</Text>
            </View>

            {/* Warnings */}
            {hasConfidenceWarning && (
              <WarningBanner title="Model Confidence Warning" color="yellow">
                {''}
              </WarningBanner>
            )}

            {hasObservationConflict && (
              <View style={styles.conflictBannerOuter}>
                <WarningBanner title="Observation Conflict" color="orange">
                  {`Conflicts: ${conflictDimensions.join(', ')}`}
                </WarningBanner>
              </View>
            )}

            {/* View Visual Evidence */}
            <TouchableOpacity
              style={styles.visualEvidenceBtn}
              onPress={() => navigation?.navigate('AiExplainability', route?.params ?? {})}
            >
              <Text style={styles.visualEvidenceIcon}>👁</Text>
              <Text style={styles.visualEvidenceText}>View Visual Evidence</Text>
            </TouchableOpacity>
          </View>

          {/* ── OBSERVATION PROFILE SUMMARY ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Observation Profile Summary</Text>
          </View>

          <View style={styles.obsCard}>
            <ObservationRow label="Spreading Pattern Texture" value="Smooth and Continuous" />
            <View style={styles.obsDivider} />
            <ObservationRow label="Grain Translucency" value="Fully Translucent" />
            <View style={styles.obsDivider} />
            <ObservationRow label="Within-dish Score Uniformity" value="Uniform" />
            <View style={styles.obsDivider} />
            <ObservationRow label="Anomaly Flags" value="No Anomaly" />
            <View style={styles.obsDivider} />
            <ObservationRow label="KOH Solution Appearance" value="Clear" />
          </View>

          {/* ── FINAL ASV SCORE PICKER ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Final ASV Score</Text>
          </View>

          <View style={styles.scorePickerRow}>
            {ASV_SCALE.map(({ score }) => {
              const isSelected = selectedScore === score;
              return (
                <TouchableOpacity
                  key={score}
                  style={[styles.scoreChip, isSelected && styles.scoreChipSelected]}
                  onPress={() => setSelectedScore(score)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.scoreChipText, isSelected && styles.scoreChipTextSelected]}>
                    {score}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected score label */}
          {selectedScore !== null && (
            <View style={styles.selectedScoreInfo}>
              <Text style={styles.selectedScoreInfoText}>
                Selected: ASV {selectedScore}
              </Text>
              <Text style={styles.selectedScoreGT}>{getGTLabel(selectedScore)}</Text>
            </View>
          )}

          {/* ── SCORE DEVIATION SECTION ── */}
          {needsDeviation && (
            <View style={[styles.alertCard, styles.alertCardOrange]}>
              <View style={styles.alertCardTitleRow}>
                <Text style={styles.alertIcon}>⚠</Text>
                <Text style={[styles.alertCardTitle, { color: '#9A3412' }]}>
                  Score Deviation Detected
                </Text>
              </View>
              <Text style={styles.alertCardBody}>
                Your selected score ({selectedScore}) differs from the AI draft ({aiDraftScore}).{'\n'}
                Please explain the reason for this deviation.
              </Text>

              <Text style={styles.inputLabel}>Score Deviation Remark *</Text>
              <TextInput
                style={[
                  styles.textArea,
                  deviationRemark.trim().length > 0 && styles.textAreaFilled,
                ]}
                placeholder="Explain why you are deviating from the AI draft"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                value={deviationRemark}
                onChangeText={setDeviationRemark}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* ── OBSERVATION CONFLICT RESOLUTION ── */}
          {needsConflict && (
            <View style={[styles.alertCard, styles.alertCardOrange]}>
              <View style={styles.alertCardTitleRow}>
                <Text style={styles.alertIcon}>⚠</Text>
                <Text style={[styles.alertCardTitle, { color: '#9A3412' }]}>
                  Observation Conflict Resolution{'\n'}Required
                </Text>
              </View>
              <Text style={styles.alertCardBody}>
                The following observation dimensions conflict with the draft score:
              </Text>
              {conflictDimensions.map((dim: string) => (
                <Text key={dim} style={styles.conflictDim}>• {dim}</Text>
              ))}
              <Text style={[styles.alertCardBody, { marginTop: 6 }]}>
                Please address and resolve this conflict in your remarks.
              </Text>

              <Text style={styles.inputLabel}>Conflict Resolution Remark *</Text>
              <TextInput
                style={[
                  styles.textArea,
                  conflictRemark.trim().length > 0 && styles.textAreaFilled,
                ]}
                placeholder="Explain how you have resolved the observation"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                value={conflictRemark}
                onChangeText={setConflictRemark}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Bottom padding for footer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── CONFIRM BUTTON FOOTER ── */}
        <View style={styles.footer}>
          <Animated.View style={{ width: '100%', transform: [{ scale: pulse }] }}>
            <TouchableOpacity
              style={[styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              activeOpacity={isValid ? 0.85 : 1}
              disabled={!isValid}
            >
              <Text style={styles.confirmBtnIcon}>✓</Text>
              <Text style={styles.confirmBtnText}>Confirm Score</Text>
            </TouchableOpacity>
          </Animated.View>

          {!isValid && selectedScore === null && (
            <Text style={styles.footerHint}>Select a Final ASV Score to continue</Text>
          )}
          {!isValid && selectedScore !== null && (
            <Text style={styles.footerHint}>Fill in required remark fields to continue</Text>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // ── HEADER ──
  header: {
    backgroundColor: GREEN,
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  headerSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 2,
  },

  infoBanner: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  infoBannerLine1: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  infoBannerLine2: {
    color: '#DCFCE7',
    fontSize: 12,
    marginTop: 3,
    opacity: 0.85,
  },

  thumbnailContainer: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  thumbnailPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  thumbnail: {
    width: '100%',
    height: '100%',
  },

  // ── SCROLL ──
  scrollContent: {
    padding: 16,
  },

  // ── CARD ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },

  cardTitleIcon: {
    color: '#B45309',
    fontSize: 16,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  // ── DRAFT SCORE ──
  draftScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },

  draftScoreCaption: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },

  draftScoreValue: {
    fontSize: 38,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 44,
  },

  certaintyCaption: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
    textAlign: 'right',
  },

  certaintyValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },

  // ── GT BOX ──
  gtBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  gtCaption: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 3,
    fontWeight: '500',
  },

  gtValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  // ── WARNING BANNER ──
  warningBanner: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 10,
  },

  warningTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },

  warningIcon: {
    fontSize: 15,
  },

  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
  },

  warningBody: {
    fontSize: 13,
    lineHeight: 18,
  },

  conflictBannerOuter: {
    marginTop: -2,
  },

  // ── VISUAL EVIDENCE BUTTON ──
  visualEvidenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: '#FAF5FF',
    marginTop: 4,
  },

  visualEvidenceIcon: {
    fontSize: 15,
  },

  visualEvidenceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },

  // ── SECTION HEADER ──
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  // ── OBSERVATION CARD ──
  obsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 4,
  },

  obsRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  obsLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 3,
  },

  obsValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

  obsDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },

  // ── SCORE PICKER ──
  scorePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 12,
  },

  scoreChip: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  scoreChipSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  scoreChipText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
  },

  scoreChipTextSelected: {
    color: '#FFFFFF',
  },

  // ── SELECTED SCORE INFO ──
  selectedScoreInfo: {
    backgroundColor: '#F0FFF4',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },

  selectedScoreInfoText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '600',
    marginBottom: 2,
  },

  selectedScoreGT: {
    fontSize: 15,
    fontWeight: '700',
    color: '#14532D',
  },

  // ── ALERT CARD ──
  alertCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
  },

  alertCardOrange: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },

  alertCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },

  alertIcon: {
    fontSize: 16,
    color: '#9A3412',
    marginTop: 1,
  },

  alertCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    lineHeight: 22,
  },

  alertCardBody: {
    fontSize: 13,
    color: '#7C2D12',
    lineHeight: 19,
  },

  conflictDim: {
    fontSize: 13,
    color: '#7C2D12',
    fontWeight: '600',
    marginLeft: 4,
    marginTop: 2,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    marginTop: 14,
    marginBottom: 8,
  },

  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    lineHeight: 20,
  },

  textAreaFilled: {
    borderColor: GREEN,
    backgroundColor: '#F0FFF4',
  },

  // ── FOOTER ──
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },

  confirmBtn: {
    width: '100%',
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },

  confirmBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },

  confirmBtnIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  footerHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});