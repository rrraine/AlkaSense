import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StatusBar,
} from 'react-native';

const GREEN = '#008236';

// ─────────────────────────────────────────────────────────────
// Certainty Bar
// ─────────────────────────────────────────────────────────────
function CertaintyBar({ value, rawConfidence }: { value: number; rawConfidence: number }) {

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value / 100,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  const widthPct = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View>

      <View style={styles.certaintyRow}>

        <Text style={styles.certaintyLabel}>
          Calibrated Certainty
        </Text>

        <Text style={styles.certaintyPct}>
          {value}%
        </Text>

      </View>

      <View style={styles.certaintyTrack}>
        <Animated.View
          style={[
            styles.certaintyFill,
            { width: widthPct },
          ]}
        />
      </View>

      <Text style={styles.certaintyNote}>
        Raw confidence: {rawConfidence}% (adjusted for observation conflicts)
      </Text>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Warning Banner
// ─────────────────────────────────────────────────────────────
function WarningBanner({
  title,
  children,
  color,
}: {
  title: string;
  children: React.ReactNode;
  color: 'yellow' | 'orange';
}) {

  const bg =
    color === 'yellow'
      ? '#FFFBEB'
      : '#FFF7ED';

  const border =
    color === 'yellow'
      ? '#FCD34D'
      : '#FDBA74';

  const titleC =
    color === 'yellow'
      ? '#92400E'
      : '#9A3412';

  const textC =
    color === 'yellow'
      ? '#78350F'
      : '#7C2D12';

  return (
    <View
      style={[
        styles.warningBanner,
        {
          backgroundColor: bg,
          borderColor: border,
        },
      ]}
    >

      <View style={styles.warningTitleRow}>

        <Text
          style={[
            styles.warningIcon,
            { color: titleC },
          ]}
        >
          ⚠
        </Text>

        <Text
          style={[
            styles.warningTitle,
            { color: titleC },
          ]}
        >
          {title}
        </Text>

      </View>

      <View style={{ marginLeft: 26 }}>

        <Text
          style={[
            styles.warningBody,
            { color: textC },
          ]}
        >
          {children}
        </Text>

      </View>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ASV SCALE
// ─────────────────────────────────────────────────────────────
const ASV_SCALE = [
  { score: 1, label: 'High GT (>74°C)' },
  { score: 2, label: 'High GT (>74°C)' },
  { score: 3, label: 'Intermediate GT (70-74°C)' },
  { score: 4, label: 'Intermediate GT (70-74°C)' },
  { score: 5, label: 'Intermediate GT (70-74°C)' },
  { score: 6, label: 'Low GT (<70°C)' },
  { score: 7, label: 'Low GT (<70°C)' },
];

function ScaleRow({
  score,
  label,
  active,
}: {
  score: number;
  label: string;
  active: boolean;
}) {

  return (
    <View
      style={[
        styles.scaleRow,
        active && styles.scaleRowActive,
      ]}
    >

      <View
        style={[
          styles.scaleNum,
          active && styles.scaleNumActive,
        ]}
      >

        <Text
          style={[
            styles.scaleNumText,
            active && styles.scaleNumTextActive,
          ]}
        >
          {score}
        </Text>

      </View>

      <Text
        style={[
          styles.scaleLabel,
          active && styles.scaleLabelActive,
        ]}
      >
        {label}
      </Text>

      {active && (
        <Text style={styles.scaleSparkle}>
          ✦
        </Text>
      )}

    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// IMAGE MODAL
// ─────────────────────────────────────────────────────────────
function ImagePreviewModal({
  visible,
  imageUri,
  sampleId,
  onClose,
}: {
  visible: boolean;
  imageUri?: string;
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

      <Pressable
        style={styles.modalBackdrop}
        onPress={onClose}
      >

        <Pressable
          style={styles.modalContent}
          onPress={() => {}}
        >

          <View style={styles.modalHeader}>

            <Text style={styles.modalTitle}>
              Submitted Image
            </Text>

            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseBtn}
            >

              <Text style={styles.modalCloseText}>
                ✕
              </Text>

            </TouchableOpacity>

          </View>

          <Text style={styles.modalSubtitle}>
            Sample {sampleId}
          </Text>

          <Image
            source={imageUri ? { uri: imageUri } : undefined}
            style={styles.modalImage}
            resizeMode="contain"
          />

        </Pressable>

      </Pressable>

    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function AiDraftResultScreen({
  navigation,
  route,
}: any) {

  const {
    imageUri,

    sampleId = 'S003',
    variety = 'NSIC Rc 222',
    grainCount = '10',
    session = 'Spring Harvest 2026',
    sessionId,
    evaluationId,

    aiDraftScore = 5,
    rawConfidence = 72,
    calibratedCertainty = 58,

    hasConfidenceWarning = true,
    hasObservationConflict = true,

    answers = {},
    conflictDimensions = [],

  } = route?.params ?? {};

  const [previewVisible, setPreviewVisible] = useState(false);

  function getGTLabel(score: number) {

    if (score <= 2) {
      return {
        tier: 'High GT',
        range: '>74°C',
      };
    }

    if (score <= 5) {
      return {
        tier: 'Intermediate GT',
        range: '70-74°C',
      };
    }

    return {
      tier: 'Low GT',
      range: '<70°C',
    };
  }

  const gt = getGTLabel(aiDraftScore);

  function handleConfirm() {

    navigation?.navigate('AiScoreConfirm', {
      imageUri,
      sampleId,
      variety,
      grainCount,
      session,
      sessionId,
      evaluationId,
      aiDraftScore,
      answers,
    });
  }

  return (
    <View style={styles.root}>

      <StatusBar barStyle="light-content" />

      {/* HEADER */}

      <View style={styles.header}>

        <View style={styles.headerTopRow}>

          <TouchableOpacity
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.backArrow}>
              ←
            </Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            AI Draft Result
          </Text>

        </View>

        <Text style={styles.headerSubtitle}>
          Sample {sampleId}
        </Text>

        {/* INFO BANNER */}

        <View style={styles.infoBanner}>

          <View style={styles.infoBannerText}>

            <Text style={styles.infoBannerLine1}>
              {sampleId} • {variety} • {grainCount} grains
            </Text>

            <Text style={styles.infoBannerLine2}>
              Session: {session}
            </Text>

          </View>

          {/* IMAGE THUMBNAIL */}

          <TouchableOpacity
            style={styles.thumbnailContainer}
            activeOpacity={0.85}
            onPress={() => setPreviewVisible(true)}
          >

            {imageUri ? (

              <Image
                source={{ uri: imageUri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />

            ) : (

              <View style={styles.thumbnailPlaceholder} />

            )}

            <View style={styles.thumbnailOverlay}>
              <Text style={styles.thumbnailOverlayIcon}>
                ⛶
              </Text>
            </View>

          </TouchableOpacity>

        </View>

      </View>

      {/* IMAGE MODAL */}

      <ImagePreviewModal
        visible={previewVisible}
        imageUri={imageUri}
        sampleId={sampleId}
        onClose={() => setPreviewVisible(false)}
      />

      {/* BODY */}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* WARNINGS */}

        {hasConfidenceWarning && (

          <WarningBanner
            title="Model Confidence Warning"
            color="yellow"
          >
            The AI model's raw confidence score ({rawConfidence}%)
            is below the recommended threshold.
            The image classification may be uncertain.
          </WarningBanner>

        )}

        {hasObservationConflict && (

          <WarningBanner
            title="Observation Conflict Warning"
            color="orange"
          >
            {`The draft ASV score conflicts with your observation entries for:\n${
              (conflictDimensions.length > 0 ? conflictDimensions : ['Spreading Pattern Texture', 'Grain Translucency'])
                .map((d: string) => `• ${d}`)
                .join('\n')
            }`}
          </WarningBanner>

        )}

        {/* SCORE CARD */}

        <View style={styles.scoreCard}>

          <Text style={styles.scoreDraftLabel}>
            AI Draft ASV Score
          </Text>

          <View style={styles.scoreBubble}>

            <Text style={styles.scoreBubbleText}>
              {aiDraftScore}
            </Text>

          </View>

          <Text style={styles.aiGeneratedTag}>
            ✦ AI-generated draft
          </Text>

          {/* GT */}

          <View style={styles.gtRow}>

            <Text style={styles.gtTierLabel}>
              Gelatinization Temperature
            </Text>

            <Text style={styles.gtTier}>
              {gt.tier}
            </Text>

            <Text style={styles.gtRange}>
              {gt.range}
            </Text>

          </View>

          {/* CERTAINTY */}

          <View style={styles.certaintyWrapper}>

            <CertaintyBar
              value={calibratedCertainty}
              rawConfidence={rawConfidence}
            />

          </View>

        </View>

        {/* ASV SCALE */}

        <View style={styles.sectionCard}>

          <Text style={styles.sectionTitle}>
            ASV Reference Scale
          </Text>

          <View style={styles.scaleList}>

            {ASV_SCALE.map((item) => (

              <ScaleRow
                key={item.score}
                score={item.score}
                label={item.label}
                active={item.score === aiDraftScore}
              />

            ))}

          </View>

        </View>

        {/* VISUAL EVIDENCE */}

        <View style={styles.sectionCard}>

          <Text style={styles.sectionTitle}>
            Visual Evidence
          </Text>

          <View style={styles.heatmapBox}>

            {imageUri ? (

              <Image
                source={{ uri: imageUri }}
                style={styles.heatmapImage}
                resizeMode="cover"
              />

            ) : (

              <View style={styles.thumbnailPlaceholder} />

            )}

          </View>

          <TouchableOpacity
  style={styles.explainBtn}
  onPress={() =>
    navigation?.navigate('AiExplainability', {
      imageUri,
      sampleId,
      variety,
      grainCount,
      session,
      aiDraftScore,
      rawConfidence,
      calibratedCertainty,
      allScores: route?.params?.allScores ?? [],
    })
  }
  activeOpacity={0.85}
>

            <Text style={styles.explainIcon}>
              ◉
            </Text>

            <Text style={styles.explainText}>
              View Detailed Explainability
            </Text>

          </TouchableOpacity>

        </View>


        {/* EXPERT OBSERVATIONS */}

        <View style={styles.sectionCard}>

          <Text style={styles.sectionTitle}>
            Expert Observations
          </Text>

          {[
            { label: 'Spreading Pattern Texture', value: answers?.spreadingPattern },
            { label: 'Grain Translucency',         value: answers?.grainTranslucency },
            { label: 'Score Uniformity',            value: answers?.scoreUniformity },
            {
              label: 'Anomaly Flags',
              value:
                Array.isArray(answers?.anomalyFlags) && answers.anomalyFlags.length > 0
                  ? answers.anomalyFlags.join(', ')
                  : 'No Anomaly',
            },
            { label: 'KOH Solution Appearance',    value: answers?.kohSolution },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={[
                styles.obsRow,
                i < arr.length - 1 && styles.obsRowBorder,
              ]}
            >
              <Text style={styles.obsLabel}>{row.label}</Text>
              <Text style={styles.obsValue}>
                {row.value ?? 'Not provided'}
              </Text>
            </View>
          ))}

        </View>

        <View style={{ height: 120 }} />

      </ScrollView>

      {/* FOOTER */}

      <View style={styles.footer}>

        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          activeOpacity={0.85}
        >

          <Text style={styles.confirmBtnText}>
            Proceed to Confirm Score →
          </Text>

        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Review and confirm the final ASV score
        </Text>

      </View>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  // HEADER

  header: {
    backgroundColor: GREEN,
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 6,
  },

  backArrow: {
    color: '#FFFFFF',
    fontSize: 24,
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

  // INFO BANNER

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

  // THUMBNAIL

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

  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
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

  // SCROLL

  scrollContent: {
    padding: 16,
    gap: 12,
  },

  // WARNING

  warningBanner: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },

  warningTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },

  warningIcon: {
    fontSize: 16,
  },

  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
  },

  warningBody: {
    fontSize: 13,
    lineHeight: 19,
  },

  // SCORE CARD

  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  scoreDraftLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 12,
  },

  scoreBubble: {
    width: 82,
    height: 82,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  scoreBubbleText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
  },

  aiGeneratedTag: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 18,
  },

  // GT

  gtRow: {
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },

  gtTierLabel: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  gtTier: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1D4ED8',
  },

  gtRange: {
    fontSize: 13,
    color: '#3B82F6',
    marginTop: 2,
  },

  // CERTAINTY

  certaintyWrapper: {
    width: '100%',
  },

  certaintyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  certaintyLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },

  certaintyPct: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
  },

  certaintyTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },

  certaintyFill: {
    height: '100%',
    backgroundColor: GREEN,
    borderRadius: 4,
  },

  certaintyNote: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // SECTION

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },

  // SCALE

  scaleList: {
    gap: 8,
  },

  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },

  scaleRowActive: {
    backgroundColor: '#F0FFF4',
    borderWidth: 1.5,
    borderColor: GREEN,
  },

  scaleNum: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scaleNumActive: {
    backgroundColor: GREEN,
  },

  scaleNumText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },

  scaleNumTextActive: {
    color: '#FFFFFF',
  },

  scaleLabel: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },

  scaleLabelActive: {
    color: '#111827',
    fontWeight: '600',
  },

  scaleSparkle: {
    fontSize: 16,
    color: GREEN,
  },

  // VISUAL EVIDENCE

  heatmapBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    height: 300,
    overflow: 'hidden',
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heatmapImage: {
    width: '100%',
    height: '100%',
  },

  explainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    paddingVertical: 13,
    backgroundColor: '#FAF5FF',
  },

  explainIcon: {
    fontSize: 16,
    color: '#7C3AED',
  },

  explainText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },

  // OBSERVATIONS

  obsRow: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },

  obsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  obsLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 3,
  },

  obsValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

  // FOOTER

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
    gap: 6,
  },

  confirmBtn: {
    width: '100%',
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },

  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  footerNote: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // MODAL

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