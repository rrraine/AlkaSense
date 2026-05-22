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
// ASV Score definitions
// ─────────────────────────────────────────────────────────────────────────────

interface AsvScore {
  value: number;
  label: string;
  gelatinizationTemp: string;
  description: string;
}

const ASV_SCORES: AsvScore[] = [
  {
    value: 1,
    label: 'High GT',
    gelatinizationTemp: '>74°C',
    description: 'No spreading; grains remain completely intact',
  },
  {
    value: 2,
    label: 'High GT',
    gelatinizationTemp: '>74°C',
    description: 'Very slight spreading; grains mostly intact with faint swelling',
  },
  {
    value: 3,
    label: 'Intermediate GT',
    gelatinizationTemp: '70–74°C',
    description: 'Limited spreading; swollen grain with small eroded collar',
  },
  {
    value: 4,
    label: 'Intermediate GT',
    gelatinizationTemp: '70–74°C',
    description: 'Wide spreading; swollen grain with defined eroded collar',
  },
  {
    value: 5,
    label: 'Intermediate GT',
    gelatinizationTemp: '70–74°C',
    description: 'Wide spreading; split or segmented grain with full collar',
  },
  {
    value: 6,
    label: 'Low GT',
    gelatinizationTemp: '<70°C',
    description: 'Complete spreading; disintegrated grain with large diffuse collar',
  },
  {
    value: 7,
    label: 'Low GT',
    gelatinizationTemp: '<70°C',
    description: 'Complete dissolution; grain fully dispersed, no distinct mass',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GT badge color helpers
// ─────────────────────────────────────────────────────────────────────────────

function getBadgeColors(label: string): { bg: string; text: string } {
  if (label === 'High GT')         return { bg: '#FEF2F2', text: '#B91C1C' };
  if (label === 'Intermediate GT') return { bg: '#FFF7ED', text: '#C2410C' };
  return                                  { bg: '#F0FFF4', text: '#166534' }; // Low GT
}

// ─────────────────────────────────────────────────────────────────────────────
// Image Preview Modal  (identical pattern to ExpertObservationScreen)
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
            <Text style={styles.modalTitle}>Captured Image</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>Sample {sampleId}</Text>

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
// Score Row
// ─────────────────────────────────────────────────────────────────────────────

function ScoreRow({
  score,
  selected,
  onPress,
}: {
  score: AsvScore;
  selected: boolean;
  onPress: () => void;
}) {
  const badge = getBadgeColors(score.label);

  return (
    <TouchableOpacity
      style={[styles.scoreRow, selected && styles.scoreRowSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Number bubble */}
      <View style={[styles.scoreBubble, selected && styles.scoreBubbleSelected]}>
        <Text style={[styles.scoreBubbleText, selected && styles.scoreBubbleTextSelected]}>
          {score.value}
        </Text>
      </View>

      {/* Labels */}
      <View style={styles.scoreTextBlock}>
        <View style={styles.scoreTopLine}>
          <Text style={[styles.scoreLabel, selected && styles.scoreLabelSelected]}>
            {score.label}
          </Text>
          <View style={[styles.tempBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.tempBadgeText, { color: badge.text }]}>
              {score.gelatinizationTemp}
            </Text>
          </View>
        </View>
        {selected && (
          <Text style={styles.scoreDescription}>
            {score.description}
          </Text>
        )}
      </View>


    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ManualScoreScreen({ navigation, route }: any) {
  const {
    imageUri,
    sampleId,
    variety,
    grainCount,
    session,
    answers,
  } = route.params;

  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  function handleProceed() {
    if (selectedScore === null) return;
    navigation.navigate('ScoreConfirmed', {
      imageUri,
      sampleId,
      variety,
      grainCount,
      session,
      answers,
      manualScore: selectedScore,
    });
  }

  const chosenScore = ASV_SCORES.find((s) => s.value === selectedScore);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manual Scoring</Text>
        </View>
        <Text style={styles.headerSubtitle}>Sample {sampleId}</Text>

        {/* Info Banner — same pattern as ExpertObservationScreen */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerText}>
            <Text style={styles.infoBannerLine1}>
              {sampleId} • {variety} • {grainCount} grains
            </Text>
            <Text style={styles.infoBannerLine2}>Session: {session}</Text>
          </View>

          {/* Tappable thumbnail → opens full image modal */}
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

      {/* ── SCROLL BODY ────────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Section heading */}
        <View style={styles.sectionHeadingCard}>
          <Text style={styles.sectionHeading}>Select a score</Text>
          <Text style={styles.sectionHint}>
            Tap a score to see the full descriptor. Only one score may be selected.
          </Text>
        </View>

        {/* ASV Reference Scale */}
        <View style={styles.scaleCard}>
          <Text style={styles.scaleCardTitle}>ASV Reference Scale</Text>

          <View style={styles.scoreList}>
            {ASV_SCORES.map((score) => (
              <ScoreRow
                key={score.value}
                score={score}
                selected={selectedScore === score.value}
                onPress={() =>
                  setSelectedScore(
                    selectedScore === score.value ? null : score.value,
                  )
                }
              />
            ))}
          </View>
        </View>

        {/* Visual Evidence — shows the captured image */}
        <View style={styles.evidenceCard}>
          <Text style={styles.evidenceTitle}>Visual Evidence</Text>
          <Text style={styles.evidenceSubtitle}>
            Captured sample image for reference
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setImageModalVisible(true)}
            style={styles.evidenceImageWrapper}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.evidenceImage}
              resizeMode="cover"
            />
            {/* Expand hint overlay */}
            <View style={styles.evidenceImageOverlay}>
              <View style={styles.expandPill}>
                <Text style={styles.expandPillText}>⛶  Tap to expand</Text>
              </View>
            </View>
          </TouchableOpacity>

          <Text style={styles.evidenceCaption}>
            {sampleId} · {variety} · {grainCount} grains
          </Text>
        </View>

      </ScrollView>

      {/* ── FOOTER ─────────────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        {selectedScore !== null && chosenScore && (
          <View style={styles.footerSelectedHint}>
            <View style={[styles.footerScoreBubble]}>
              <Text style={styles.footerScoreBubbleText}>{selectedScore}</Text>
            </View>
            <Text style={styles.footerSelectedLabel}>
              {chosenScore.label} · {chosenScore.gelatinizationTemp}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.proceedBtn,
            selectedScore === null && styles.proceedBtnDisabled,
          ]}
          onPress={handleProceed}
          disabled={selectedScore === null}
        >
          <Text style={styles.proceedBtnText}>
            Confirm Score
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerHint}>
          Review and confirm the final ASV score
        </Text>
      </View>

      {/* ── IMAGE PREVIEW MODAL ─────────────────────────────────────────────────── */}
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
    paddingBottom: 20,
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

  headerSubtitle: {
    color: '#E5E7EB',
    fontSize: 14,
    marginBottom: 12,
  },

  // ── Info Banner (matches ExpertObservationScreen exactly) ───────────────────
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
    paddingBottom: 160,
    gap: 14,
  },

  // ── Section Heading Card ─────────────────────────────────────────────────────
  sectionHeadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },

  sectionHint: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  // ── Scale Card ───────────────────────────────────────────────────────────────
  scaleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  scaleCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },

  scoreList: {
    gap: 8,
  },

  // ── Score Row ────────────────────────────────────────────────────────────────
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },

  scoreRowSelected: {
    borderColor: GREEN,
    backgroundColor: '#F0FFF4',
  },

  scoreBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },

  scoreBubbleSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  scoreBubbleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },

  scoreBubbleTextSelected: {
    color: '#FFFFFF',
  },

  scoreTextBlock: {
    flex: 1,
  },

  scoreTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  scoreLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  scoreLabelSelected: {
    color: '#166534',
    fontWeight: '700',
  },

  tempBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },

  tempBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  scoreDescription: {
    fontSize: 13,
    color: '#4B7A5B',
    marginTop: 5,
    lineHeight: 18,
  },

  // ── Visual Evidence Card ─────────────────────────────────────────────────────
  evidenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  evidenceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },

  evidenceSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
  },

  evidenceImageWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },

  evidenceImage: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },

  evidenceImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 10,
  },

  expandPill: {
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  expandPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  evidenceCaption: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 10,
    textAlign: 'center',
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },

  footerSelectedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FFF4',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },

  footerScoreBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerScoreBubbleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  footerSelectedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },

  proceedBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  proceedBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },

  proceedBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },

  footerHint: {
    textAlign: 'center',
    fontSize: 12,
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
});