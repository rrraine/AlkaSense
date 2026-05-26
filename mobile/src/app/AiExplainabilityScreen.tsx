import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { requestAIExplainability, type AIExplainResult } from '../services/AiService';

const GREEN = '#008236';

// ─────────────────────────────────────────────────────────────────────────────
// Heatmap Legend
// ─────────────────────────────────────────────────────────────────────────────

function HeatmapLegend() {
  return (
    <View style={styles.legendCard}>
      <Text style={styles.legendTitle}>Attention Heatmap Legend</Text>
      <View style={styles.legendList}>
        {[
          { color: '#EF4444', label: 'High Attention',      desc: 'Critical regions for classification' },
          { color: '#F97316', label: 'Moderate-High',       desc: 'Strong contributing features' },
          { color: '#FACC15', label: 'Moderate Attention',  desc: 'Supporting features' },
          { color: '#4ADE80', label: 'Low Attention',       desc: 'Background / less influential regions' },
          { color: '#60A5FA', label: 'Minimal Attention',   desc: 'Non-discriminative areas' },
        ].map(({ color, label, desc }) => (
          <View key={label} style={styles.legendRow}>
            <View style={[styles.legendColor, { backgroundColor: color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.legendLabel}>{label}</Text>
              <Text style={styles.legendDescription}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton for the summary card
// ─────────────────────────────────────────────────────────────────────────────

function SummarySkeleton() {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>AI Analysis Summary</Text>
      {[120, 90, 140].map((w, i) => (
        <Animated.View
          key={i}
          style={[styles.skeletonBar, { width: `${w * 100 / 140}%`, opacity: anim, marginBottom: i < 2 ? 14 : 0 }]}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function AiExplainabilityScreen({ navigation, route }: any) {
  const {
    imageUri,
    aiDraftScore,
    calibratedCertainty,
    rawConfidence,
    allScores,
  } = route?.params ?? {};

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AIExplainResult | null>(null);

  useEffect(() => {
    if (!imageUri || !aiDraftScore) {
      setLoading(false);
      return;
    }

    requestAIExplainability({
      imageUri,
      asvScore: aiDraftScore,
      calibratedCertainty: calibratedCertainty ?? 0,
      allScores: allScores ?? [],
    }).then((data) => {
      setResult(data);
      setLoading(false);
    });
  }, []);

  // When GradCAM overlay is available, use it as the heatmap image URI
  const heatmapUri = result?.heatmap_base64
    ? `data:image/png;base64,${result.heatmap_base64}`
    : null;

  const displayUri = showHeatmap && heatmapUri ? heatmapUri : imageUri;
  const canToggle = !!heatmapUri;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>AI Explainability</Text>
            <Text style={styles.headerSubtitle}>Visual Analysis</Text>
          </View>
        </View>
      </View>

      {/* ── BODY ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* INFO CARD */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoIcon}>i</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Grad-CAM Heatmap Visualization</Text>
              <Text style={styles.infoBody}>
                Highlighted regions show where the AI model focused attention
                when classifying the grain. Red/warm = high influence.
              </Text>
            </View>
          </View>
        </View>

        {/* TOGGLE CARD */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleTitle}>
              {showHeatmap ? 'Heatmap\nOverlay ON' : 'Original\nImage'}
            </Text>
          </View>
          <View style={styles.toggleCenter}>
            <Text style={styles.toggleDescription}>
              {canToggle
                ? 'Toggle AI attention visualization'
                : loading
                  ? 'Generating heatmap…'
                  : 'Heatmap unavailable (Keras model not loaded)'}
            </Text>
          </View>
          <Switch
            value={showHeatmap && canToggle}
            onValueChange={(v) => { if (canToggle) setShowHeatmap(v); }}
            disabled={!canToggle}
            trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
            thumbColor={showHeatmap && canToggle ? GREEN : '#FFFFFF'}
          />
        </View>

        {/* IMAGE CARD */}
        <View style={styles.imageCard}>
          {showHeatmap && canToggle && (
            <View style={styles.overlayChip}>
              <Text style={styles.overlayChipIcon}>◉</Text>
              <Text style={styles.overlayChipText}>Grad-CAM ON</Text>
            </View>
          )}

          {displayUri ? (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: displayUri }}
                style={styles.image}
                resizeMode="cover"
              />
              {loading && (
                <View style={styles.imageLoadingOverlay}>
                  <ActivityIndicator size="large" color={GREEN} />
                  <Text style={styles.imageLoadingText}>Generating heatmap…</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>Grain Sample Image</Text>
            </View>
          )}
        </View>

        {/* LEGEND — shown when heatmap is active */}
        {showHeatmap && <HeatmapLegend />}

        {/* SUMMARY */}
        {loading ? (
          <SummarySkeleton />
        ) : (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>AI Analysis Summary</Text>
            {result?.explanation_bullets?.length ? (
              <View style={styles.summaryList}>
                {result.explanation_bullets.map(({ label, text }) => (
                  <View key={label} style={styles.summaryRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.summaryText}>
                      <Text style={styles.summaryBold}>{label}:</Text>
                      {' '}{text}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.summaryFallback}>
                AI explanation unavailable. Check your connection.
              </Text>
            )}

            {!result?.heatmap_available && !loading && (
              <View style={styles.heatmapNotice}>
                <Text style={styles.heatmapNoticeText}>
                  Grad-CAM heatmap requires the Keras model. Set KERAS_MODEL_PATH in backend .env.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── FOOTER ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.85}
          onPress={() => navigation?.navigate('AiDraftResult', route?.params ?? {})}
        >
          <Text style={styles.backBtnText}>Back to Results</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    backgroundColor: GREEN,
    paddingTop: 54,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backArrow: { color: '#FFFFFF', fontSize: 24 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  headerSubtitle: { color: '#DCFCE7', fontSize: 13, marginTop: 2 },

  scrollContent: { padding: 16, paddingBottom: 120, gap: 14 },

  // INFO CARD
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoRow: { flexDirection: 'row', gap: 12 },
  infoIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  infoIcon: { color: '#2563EB', fontSize: 12, fontWeight: '700' },
  infoTitle: { color: '#1D4ED8', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  infoBody: { color: '#2563EB', fontSize: 13, lineHeight: 20 },

  // TOGGLE CARD
  toggleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  toggleLeft: { flex: 1 },
  toggleTitle: { fontSize: 12, fontWeight: '700', color: '#111827', lineHeight: 22 },
  toggleCenter: { flex: 1.2, paddingRight: 4 },
  toggleDescription: { fontSize: 13, color: '#6B7280', lineHeight: 18 },

  // IMAGE CARD
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  overlayChip: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overlayChipIcon: { color: GREEN, fontSize: 11 },
  overlayChipText: { color: GREEN, fontSize: 12, fontWeight: '700' },
  imageWrapper: {
    height: 360,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  image: { width: '100%', height: '100%' },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  imageLoadingText: { color: GREEN, fontSize: 13, fontWeight: '600' },
  placeholderContainer: {
    height: 360,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 16, color: '#6B7280' },

  // LEGEND
  legendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  legendTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 18 },
  legendList: { gap: 16 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  legendColor: { width: 32, height: 32, borderRadius: 6 },
  legendLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  legendDescription: { fontSize: 13, color: '#6B7280' },

  // SUMMARY
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 18 },
  summaryList: { gap: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { color: '#16A34A', fontSize: 22, lineHeight: 22 },
  summaryText: { flex: 1, fontSize: 15, color: '#374151', lineHeight: 24 },
  summaryBold: { fontWeight: '700', color: '#111827' },
  summaryFallback: { fontSize: 14, color: '#6B7280', lineHeight: 22 },

  heatmapNotice: {
    marginTop: 16,
    backgroundColor: '#FEF9C3',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  heatmapNoticeText: { fontSize: 12, color: '#713F12', lineHeight: 18 },

  // SKELETON
  skeletonBar: {
    height: 14,
    backgroundColor: '#E5E7EB',
    borderRadius: 7,
  },

  // FOOTER
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  backBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backBtnText: { fontSize: 16, fontWeight: '700', color: '#111827' },
});
