import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';

const GREEN = '#008236';

import { SampleService } from '../services/SampleService';
import { confirmEvaluation } from '../services/AiService';
import type { GTClass } from '../db/repositories/SampleRepository';

const sampleService = new SampleService();

function getGTClassification(score: number): string {
  if (score <= 2) return 'High GT (>74°C)';
  if (score <= 5) return 'Intermediate GT (70–74°C)';
  return 'Low GT (<70°C)';
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}


/** Green success banner at the top of the card */
function SuccessBanner() {
  return (
    <View style={styles.successBanner}>
      <View style={styles.successIconWrapper}>
        <Text style={styles.successIcon}>✓</Text>
      </View>
      <View style={styles.successTextBlock}>
        <Text style={styles.successTitle}>Score Successfully Confirmed</Text>
        <Text style={styles.successDesc}>
          The final ASV classification has been recorded and saved to the
          evaluation database.
        </Text>
      </View>
    </View>
  );
}

/** Large green score bubble + label */
function ScoreDisplay({ score }: { score: number }) {
  return (
    <View style={styles.scoreDisplayWrapper}>
      <Text style={styles.scoreDisplayLabel}>Final ASV Score</Text>
      <View style={styles.scoreBigBubble}>
        <Text style={styles.scoreBigText}>{score}</Text>
      </View>
    </View>
  );
}

/** A single detail row with a label + value */
function DetailRow({
  label,
  value,
  isFirst,
  isLast,
  highlight,
}: {
  label: string;
  value: string;
  isFirst?: boolean;
  isLast?: boolean;
  highlight?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,
        highlight && styles.detailRowHighlight,
        isFirst && styles.detailRowFirst,
        isLast && styles.detailRowLast,
        !isLast && styles.detailRowBorder,
      ]}
    >
      <Text style={[styles.detailLabel, highlight && styles.detailLabelHighlight]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, highlight && styles.detailValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

/** Orange warning row — only shown in AI path when there's a deviation/conflict */
function WarningRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.warningRow, !isLast && styles.detailRowBorder]}>
      <Text style={styles.warningLabel}>{label}</Text>
      <Text style={styles.warningValue}>{value}</Text>
    </View>
  );
}


export default function ScoreConfirmedScreen({ navigation, route }: any) {
  const {
    sampleId,
    variety,
    grainCount,
    session,
    sessionId,
    // Score source — exactly one of these two should be present:
    manualScore,   // present when coming from ManualScoreScreen
    aiDraftScore,  // present when coming from AIDraftScreen / ConfirmScore AI path
    finalScore: finalScoreFromRoute,
    evaluationId,
    // Contextual AI-path fields (optional):
    confirmedBy = 'Dr. Maria Santos',
    scoreDeviation,        // string | undefined — e.g. "Final score differs from AI draft"
    conflictResolution,    // string | undefined — e.g. "Observation conflict addressed"
  } = route.params;

  const isManual = manualScore !== undefined;
  const finalScore: number = isManual ? manualScore : finalScoreFromRoute ?? aiDraftScore;
  const [saving, setSaving] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function persistConfirmedScore() {
      if (!sampleId) {
        setSaveError('Missing sample ID');
        setSaving(false);
        return;
      }

      try {
        if (isManual) {
          const gtClass = getGTClassification(finalScore) as GTClass;
          await sampleService.confirmSampleScore({
            sampleId,
            asvScore: finalScore,
            gtClass,
          });
        } else if (evaluationId) {
          await confirmEvaluation({
            evaluationId,
            sampleId,
            final_asv_score: finalScore,
            correction_remark: conflictResolution ?? scoreDeviation,
          });
        }
      } catch (err: any) {
        setSaveError(err.message || 'Failed to save confirmed score');
      } finally {
        setSaving(false);
      }
    }

    persistConfirmedScore();
  }, []);
  const gtClassification = getGTClassification(finalScore);
  const timestamp = formatTimestamp(new Date());

  // AI-path deviation flags
  const hasDeviation     = !isManual && !!scoreDeviation;
  const hasConflict      = !isManual && !!conflictResolution;
  const hasAiWarnings    = hasDeviation || hasConflict;

  function handleReturn() {
    if (sessionId) {
      // Pop back to SessionProgress so useFocusEffect reloads the sample list
      navigation.navigate('SessionProgress', { sessionId });
    } else {
      navigation.navigate('Dashboard');
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Score Confirmed</Text>
        </View>
        <Text style={styles.headerSubtitle}>Sample {sampleId}</Text>
      </View>

      {/* ── SCROLL BODY ────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {saving ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={GREEN} size="large" />
            <Text style={styles.loadingText}>Saving confirmed score…</Text>
          </View>
        ) : saveError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Could not save score</Text>
            <Text style={styles.errorMessage}>{saveError}</Text>
          </View>
        ) : (
          <SuccessBanner />
        )}

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Confirmed Score Summary</Text>

          {/* Big score */}
          <ScoreDisplay score={finalScore} />

          {/* Detail rows */}
          <View style={styles.detailTable}>

            {/* GT Classification — blue highlight row (matches wireframe) */}
            <DetailRow
              label="GT Classification"
              value={gtClassification}
              isFirst
              highlight
            />

            <DetailRow
              label="Confirmed By"
              value={confirmedBy}
            />

            <DetailRow
              label="Confirmation Timestamp"
              value={timestamp}
            />

            <DetailRow
              label="AI Draft Used"
              value={isManual ? 'No' : 'Yes'}
              isLast={!hasAiWarnings}
            />

            {/* ── AI-only warning rows ── */}
            {hasDeviation && (
              <WarningRow
                label="Score Deviation Recorded"
                value={scoreDeviation}
                isLast={!hasConflict}
              />
            )}

            {hasConflict && (
              <WarningRow
                label="Conflict Resolution Recorded"
                value={conflictResolution}
                isLast
              />
            )}

          </View>
        </View>

      </ScrollView>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.returnBtn} onPress={handleReturn}>
          <Text style={styles.returnBtnText}>Return</Text>
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
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 14,
  },

  // ── Success Banner ───────────────────────────────────────────────────────────
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F0FFF4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
  },

  successIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  successIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },

  successTextBlock: {
    flex: 1,
  },

  successTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },

  successDesc: {
    fontSize: 13,
    color: '#15803D',
    lineHeight: 18,
  },

  // ── Summary Card ─────────────────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    color: '#4B5563',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTitle: {
    color: '#B91C1C',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#991B1B',
    fontSize: 14,
    lineHeight: 20,
  },

  summaryCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 20,
  },

  // ── Score Display ─────────────────────────────────────────────────────────────
  scoreDisplayWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },

  scoreDisplayLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 10,
  },

  scoreBigBubble: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  scoreBigText: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 52,
  },

  // ── Detail Table ──────────────────────────────────────────────────────────────
  detailTable: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  detailRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },

  detailRowFirst: {
    // no special rounding needed — overflow:hidden on parent handles it
  },

  detailRowLast: {
    // same
  },

  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  detailRowHighlight: {
    backgroundColor: '#EFF6FF',
  },

  detailLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  detailLabelHighlight: {
    color: '#3B82F6',
  },

  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

  detailValueHighlight: {
    color: '#1D4ED8',
    fontWeight: '700',
  },

  // ── Warning Rows (AI path only) ───────────────────────────────────────────────
  warningRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFBEB',
  },

  warningLabel: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  warningValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },

  returnBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  returnBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});