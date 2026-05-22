import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const GREEN = '#008236';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getGTClassification(asv: number): string {
  if (asv <= 2) return 'High GT (>74°C)';
  if (asv <= 5) return 'Intermediate GT (70–74°C)';
  return 'Low GT (<70°C)';
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Label + value stacked — used in Manual Observations card */
function ObservationRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.obsRow, !isLast && styles.obsRowBorder]}>
      <Text style={styles.obsLabel}>{label}</Text>
      <Text style={styles.obsValue}>{value}</Text>
    </View>
  );
}

/** Two-column metadata grid item */
function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function SamplePreviewScreen({ navigation, route }: any) {
  const {
    // Core sample fields (passed from SessionProgressScreen SampleCard)
    id            = 'S001',
    variety       = 'NSIC Rc 222',
    status        = 'Confirmed',
    asv           = 5,
    time          = '14:32',
    flagged       = false,

    // AI evaluation fields
    aiConfidence,                // number | undefined  e.g. 87
    aiAssisted     = false,

    // Manual observation fields
    grainSpreadPattern  = 'Moderate spreading (ASV 5)',
    grainDisintegration = 'Partial disintegration',
    edgeCharacteristics = 'Slightly softened edges',
    centerOpacity       = 'Partially translucent',
    textureBehavior     = 'Soft, pliable texture',

    // Free-text notes
    evaluationNotes = 'Moderate grain spreading with partial edge diffusion. Center shows translucency. Pattern consistent with intermediate gelatinization temperature.',

    // Treatment metadata
    koh         = '1.7%',
    batch       = 'PR-2026-041',
    duration    = '23h',
    temperature = '30°C',

    // Evaluator
    evaluator = 'Dr. Maria Santos',

    // Session (for back-nav)
    session,
  } = route.params ?? {};

  const gtClassification = getGTClassification(asv);

  const showAiRow    = aiAssisted && aiConfidence !== undefined;
  const showCorrect  = status === 'Confirmed';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Sample {id}</Text>
          <Text style={styles.headerSubtitle}>{variety}</Text>
        </View>

        {/* Status badge pill */}
        <View style={[
          styles.statusBadge,
          status === 'Confirmed'  && styles.statusBadgeConfirmed,
          status === 'Pending'    && styles.statusBadgePending,
          status === 'Registered' && styles.statusBadgeRegistered,
        ]}>
          {status === 'Confirmed' && (
            <Text style={styles.statusBadgeIcon}>✓ </Text>
          )}
          <Text style={[
            styles.statusBadgeText,
            status === 'Confirmed'  && styles.statusTextConfirmed,
            status === 'Pending'    && styles.statusTextPending,
            status === 'Registered' && styles.statusTextRegistered,
          ]}>
            {status}
          </Text>
        </View>
      </View>

      {/* ── SCROLL BODY ──────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── SCORE CARD ─────────────────────────────────────────────────────── */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreCardLabel}>Confirmed ASV Score</Text>

          <View style={styles.scoreBubble}>
            <Text style={styles.scoreBubbleText}>{asv}</Text>
          </View>

          {/* GT Classification row */}
          <View style={styles.classificationRow}>
            <Text style={styles.classificationIcon}>⚗</Text>
            <View>
              <Text style={styles.classificationLabel}>GT Classification</Text>
              <Text style={styles.classificationValue}>{gtClassification}</Text>
            </View>
          </View>

          {/* AI row — only shown when AI was involved */}
          {showAiRow && (
            <View style={styles.aiRow}>
              <Text style={styles.aiIcon}>👁</Text>
              <View>
                <Text style={styles.aiLabel}>AI-Assisted Evaluation</Text>
                <Text style={styles.aiValue}>Confidence: {aiConfidence}%</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── MANUAL OBSERVATIONS ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Manual Observations</Text>

          <ObservationRow label="Grain Spread Pattern"  value={grainSpreadPattern} />
          <ObservationRow label="Grain Disintegration"  value={grainDisintegration} />
          <ObservationRow label="Edge Characteristics"  value={edgeCharacteristics} />
          <ObservationRow label="Center Opacity"        value={centerOpacity} />
          <ObservationRow label="Texture Behavior"      value={textureBehavior} isLast />
        </View>

        {/* ── EVALUATION NOTES ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Evaluation Notes</Text>
          <Text style={styles.notesText}>{evaluationNotes}</Text>
        </View>

        {/* ── TREATMENT METADATA ───────────────────────────────────────────────── */}
        <View style={styles.metadataCard}>
          <Text style={styles.metadataCardTitle}>Treatment Metadata</Text>
          <View style={styles.metaGrid}>
            <MetaItem label="KOH:"         value={koh} />
            <MetaItem label="Batch:"       value={batch} />
            <MetaItem label="Duration:"    value={duration} />
            <MetaItem label="Temperature:" value={temperature} />
          </View>
        </View>

        {/* ── EVALUATION DETAILS ───────────────────────────────────────────────── */}
        <View style={styles.metadataCard}>
          <Text style={styles.metadataCardTitle}>Evaluation Details</Text>
          <View style={styles.evalDetailRow}>
            <Text style={styles.evalDetailIcon}>👤</Text>
            <Text style={styles.evalDetailText}>Evaluator:  {evaluator}</Text>
          </View>
          <View style={styles.evalDetailRow}>
            <Text style={styles.evalDetailIcon}>📅</Text>
            <Text style={styles.evalDetailText}>Date:  May 15, 2026 at {time}</Text>
          </View>
        </View>

      </ScrollView>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.correctBtn}
          onPress={() =>
            navigation.navigate('ManualScore', {
              sampleId:   id,
              variety,
              grainCount: route.params?.grainCount ?? '10',
              session,
              imageUri:   route.params?.imageUri ?? '',
            })
          }
        >
          <Text style={styles.correctBtnText}>
            Proceed to Score Correction →
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backSessionBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backSessionText}>Back to Session</Text>
        </TouchableOpacity>
      </View>

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
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  backBtn: {
    padding: 4,
  },

  backArrow: {
    color: '#FFFFFF',
    fontSize: 24,
  },

  headerCenter: {
    flex: 1,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },

  headerSubtitle: {
    color: '#D1FAE5',
    fontSize: 13,
    marginTop: 2,
  },

  // Status badge in header
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  statusBadgeConfirmed: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },

  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },

  statusBadgeRegistered: {
    backgroundColor: '#E5E7EB',
  },

  statusBadgeIcon: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  statusTextConfirmed:  { color: '#FFFFFF' },
  statusTextPending:    { color: '#B45309' },
  statusTextRegistered: { color: '#4B5563' },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scrollContent: {
    padding: 16,
    paddingBottom: 140,
    gap: 14,
  },

  // ── Score Card ───────────────────────────────────────────────────────────────
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },

  scoreCardLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 12,
  },

  scoreBubble: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },

  scoreBubbleText: {
    color: '#FFFFFF',
    fontSize: 46,
    fontWeight: '800',
    lineHeight: 54,
  },

  // GT Classification row
  classificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },

  classificationIcon: {
    fontSize: 22,
  },

  classificationLabel: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  classificationValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1D4ED8',
  },

  // AI row
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 14,
  },

  aiIcon: {
    fontSize: 20,
  },

  aiLabel: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  aiValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6D28D9',
  },

  // ── Generic Card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },

  // ── Observation Rows ──────────────────────────────────────────────────────────
  obsRow: {
    paddingVertical: 10,
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

  // ── Notes ────────────────────────────────────────────────────────────────────
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },

  // ── Metadata Card ─────────────────────────────────────────────────────────────
  metadataCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  metadataCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
  },

  metaItem: {
    width: '50%',
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },

  metaLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },

  // ── Evaluation Details ────────────────────────────────────────────────────────
  evalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },

  evalDetailIcon: {
    fontSize: 15,
  },

  evalDetailText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
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

  correctBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  correctBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },

  backSessionBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  backSessionText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
});