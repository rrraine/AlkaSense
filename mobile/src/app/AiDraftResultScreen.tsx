import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';

const GREEN = '#008236';

// ─── Calibrated Certainty bar ─────────────────────────────────────────────────
function CertaintyBar({ value }: { value: number }) {
  // value: 0–100
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
        <Text style={styles.certaintyLabel}>Calibrated Certainty</Text>
        <Text style={styles.certaintyPct}>{value}%</Text>
      </View>
      <View style={styles.certaintyTrack}>
        <Animated.View style={[styles.certaintyFill, { width: widthPct }]} />
      </View>
      <Text style={styles.certaintyNote}>
        Raw confidence: 72% (adjusted for observation conflicts)
      </Text>
    </View>
  );
}

// ─── Warning banner ───────────────────────────────────────────────────────────
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

// ─── ASV scale row ────────────────────────────────────────────────────────────
const ASV_SCALE = [
  { score: 1, label: 'High GT (>74°C)' },
  { score: 2, label: 'High GT (>74°C)' },
  { score: 3, label: 'Intermediate GT (70-74°C)' },
  { score: 4, label: 'Intermediate GT (70-74°C)' },
  { score: 5, label: 'Intermediate GT (70-74°C)' },
  { score: 6, label: 'Low GT (<70°C)' },
  { score: 7, label: 'Low GT (<70°C)' },
];

function ScaleRow({ score, label, active }: { score: number; label: string; active: boolean }) {
  return (
    <View style={[styles.scaleRow, active && styles.scaleRowActive]}>
      <View style={[styles.scaleNum, active && styles.scaleNumActive]}>
        <Text style={[styles.scaleNumText, active && styles.scaleNumTextActive]}>
          {score}
        </Text>
      </View>
      <Text style={[styles.scaleLabel, active && styles.scaleLabelActive]}>
        {label}
      </Text>
      {active && <Text style={styles.scaleSparkle}>✦</Text>}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AiDraftResultScreen({ navigation, route }: any) {
  const {
    sampleId   = 'S003',
    variety    = 'NSIC Rc 222',
    grainCount = '10',
    session    = 'Spring Harvest 2026',
    aiDraftScore = 5,
    rawConfidence = 72,
    calibratedCertainty = 58,
    hasConfidenceWarning = true,
    hasObservationConflict = true,
  } = route?.params ?? {};

  function getGTLabel(score: number) {
    if (score <= 2) return { tier: 'High GT',         range: '>74°C' };
    if (score <= 5) return { tier: 'Intermediate GT', range: '70-74°C' };
    return             { tier: 'Low GT',           range: '<70°C' };
  }

  const gt = getGTLabel(aiDraftScore);

  function handleConfirm() {
    navigation?.navigate('ScoreConfirmed', {
      sampleId,
      variety,
      grainCount,
      session,
      aiDraftScore,
    });
  }

  return (
    <View style={styles.root}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Draft Result</Text>
        </View>
        <Text style={styles.headerSubtitle}>Sample {sampleId}</Text>

        {/* Info pill */}
        <View style={styles.infoPill}>
          <View style={styles.infoPillLeft}>
            <Text style={styles.infoPillText}>
              {sampleId} • {variety} • {grainCount} grains
            </Text>
            <Text style={styles.infoPillSession}>Session: {session}</Text>
          </View>
          {/* Rice icon placeholder */}
          <View style={styles.riceIconBox}>
            <Text style={styles.riceEmoji}>🌾</Text>
          </View>
        </View>
      </View>

      {/* ── SCROLL BODY ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Warning banners */}
        {hasConfidenceWarning && (
          <WarningBanner title="Model Confidence Warning" color="yellow">
            The AI model's raw confidence score ({rawConfidence}%) is below the recommended threshold. The image classification may be uncertain.
          </WarningBanner>
        )}

        {hasObservationConflict && (
          <WarningBanner title="Observation Conflict Warning" color="orange">
            {'The draft ASV score conflicts with your observation entries for:\n• Spreading Pattern Texture\n• Grain Translucency'}
          </WarningBanner>
        )}

        {/* Score card */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreDraftLabel}>AI Draft ASV Score</Text>

          <View style={styles.scoreBubble}>
            <Text style={styles.scoreBubbleText}>{aiDraftScore}</Text>
          </View>

          <Text style={styles.aiGeneratedTag}>✦  AI-generated draft</Text>

          {/* GT classification row */}
          <View style={styles.gtRow}>
            <Text style={styles.gtTierLabel}>Gelatinization Temperature</Text>
            <Text style={styles.gtTier}>{gt.tier}</Text>
            <Text style={styles.gtRange}>{gt.range}</Text>
          </View>

          {/* Certainty bar */}
          <View style={styles.certaintyWrapper}>
            <CertaintyBar value={calibratedCertainty} />
          </View>
        </View>

        {/* ASV Reference Scale */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>ASV Reference Scale</Text>
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

        {/* Visual Evidence */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Visual Evidence</Text>

          <View style={styles.heatmapBox}>
            <Text style={styles.heatmapEmoji}>🌾</Text>
            <Text style={styles.heatmapCaption}>Heatmap overlay showing{'\n'}influential regions</Text>
          </View>

          <TouchableOpacity style={styles.explainBtn}>
            <Text style={styles.explainIcon}>◉</Text>
            <Text style={styles.explainText}>View Detailed Explainability</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── FOOTER ── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
          <Text style={styles.confirmBtnText}>Proceed to Confirm Score →</Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>Review and confirm the final ASV score</Text>
      </View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  // Header
  header: {
    backgroundColor: GREEN,
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
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
  headerSubtitle: {
    color: '#E5E7EB',
    fontSize: 14,
    marginBottom: 10,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  infoPillLeft: { flex: 1 },
  infoPillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500', opacity: 0.85 },
  infoPillSession: { color: '#DCFCE7', fontSize: 12, marginTop: 3, opacity: 0.8 },
  riceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riceEmoji: { fontSize: 24 },

  // Scroll
  scrollContent: {
    padding: 16,
    gap: 12,
  },

  // Warning banners
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
  warningIcon: { fontSize: 16 },
  warningTitle: { fontSize: 15, fontWeight: '700' },
  warningBody:  { fontSize: 13, lineHeight: 19 },

  // Score card
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
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 10,
  },
  scoreBubbleText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 48,
  },
  aiGeneratedTag: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 18,
  },

  // GT row
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
    letterSpacing: 0.4,
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

  // Certainty bar
  certaintyWrapper: { width: '100%' },
  certaintyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  certaintyLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  certaintyPct:   { fontSize: 13, color: '#111827', fontWeight: '700' },
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

  // Section cards
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

  // Scale
  scaleList: { gap: 8 },
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

  // Visual Evidence
  heatmapBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    gap: 10,
  },
  heatmapEmoji: { fontSize: 48, opacity: 0.6 },
  heatmapCaption: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 19,
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
  explainIcon: { fontSize: 16, color: '#7C3AED' },
  explainText: { fontSize: 14, fontWeight: '600', color: '#7C3AED' },

  // Footer
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
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
});