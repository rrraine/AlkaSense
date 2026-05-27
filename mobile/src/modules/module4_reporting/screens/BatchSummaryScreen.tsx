import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';

import Svg, { Path, Text as SvgText } from 'react-native-svg';
import {
  fetchSessionProgress,
  SessionProgress,
} from '../services/SessionProgressService';
import { generateReport, getReportBySession } from '../services/ReportExportService';
import { SessionReportRecord } from '../../../shared/types/report.types';

const GREEN = '#008236';

// ─────────────────────────────────────────────────────────────
// PIE CHART
// ─────────────────────────────────────────────────────────────

const SIZE = 170;
const R = SIZE / 2;

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const startPt = polar(cx, cy, r, end);
  const endPt   = polar(cx, cy, r, start);
  const largeArc = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 0 ${endPt.x} ${endPt.y} Z`;
}

type GTSlice = { value: number; color: string; label: string };

function PieChart({ slices }: { slices: GTSlice[] }) {
  const total = slices.reduce((a, b) => a + b.value, 0) || 1;
  let cursor = 0;
  const computed = slices.map((s) => {
    const angle = (s.value / total) * 360;
    const midAngle = cursor + angle / 2;
    const out = { ...s, start: cursor, end: cursor + angle, midAngle };
    cursor += angle;
    return out;
  });
  const LABEL_R = R * 0.62;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>GT Classification Distribution</Text>
      <View style={{ alignItems: 'center' }}>
        <Svg width={SIZE + 80} height={SIZE} viewBox={`-40 0 ${SIZE + 80} ${SIZE}`}>
          {computed.map((s, i) => (
            <Path key={i} d={arcPath(R, R, R, s.start, s.end)} fill={s.color} />
          ))}
          {computed.map((s, i) => {
            const pt = polar(R, R, LABEL_R, s.midAngle);
            if (s.value === 0) return null;
            return (
              <SvgText
                key={`lbl-${i}`}
                x={pt.x}
                y={pt.y + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#fff"
              >
                {`${Math.round((s.value / total) * 100)}%`}
              </SvgText>
            );
          })}
        </Svg>
      </View>
      <View style={styles.pieLegendRow}>
        {slices.map((s) => (
          <View key={s.label} style={styles.legendItemRow}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ANIMATED BAR CHART
// ─────────────────────────────────────────────────────────────

const CHART_HEIGHT = 140;

function AnimatedBarChart({ distribution }: { distribution: number[] }) {
  const animValues = useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const asvMax = Math.max(...distribution, 1);
    const animations = animValues.map((v, i) =>
      Animated.spring(v, {
        toValue: ((distribution[i] ?? 0) / asvMax) * CHART_HEIGHT,
        friction: 7,
        tension: 50,
        delay: i * 80,
        useNativeDriver: false,
      })
    );
    Animated.stagger(60, animations).start();
  }, [distribution]);

  const asvMax = Math.max(...distribution, 1);
  const yLabels = [asvMax, Math.round(asvMax * 0.75), Math.round(asvMax * 0.5), Math.round(asvMax * 0.25), 0];

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>ASV Distribution</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ height: CHART_HEIGHT + 20, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 4, paddingBottom: 20 }}>
          {yLabels.map((label, i) => (
            <Text key={i} style={styles.yAxisLabel}>{label}</Text>
          ))}
        </View>
        <View style={{ flex: 1, flexDirection: 'row', height: CHART_HEIGHT + 20, alignItems: 'flex-end' }}>
          {animValues.map((animVal, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Animated.View
                style={{
                  width: 22,
                  height: animVal,
                  backgroundColor: '#16A34A',
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                }}
              />
              <Text style={{ fontSize: 12, marginTop: 4, color: '#374151' }}>{i + 1}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────

export default function BatchSummaryScreen({ navigation, route }: any) {
  const { sessionId } = route?.params ?? {};
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [report, setReport]     = useState<SessionReportRecord | null>(null);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    Promise.all([
      fetchSessionProgress(sessionId).catch(() => null),
      getReportBySession(sessionId).catch(() => null),
    ]).then(([prog, rep]) => {
      if (prog) setProgress(prog);
      if (rep) setReport(rep);
      setLoading(false);
    });
  }, [sessionId]);

  async function handleExportCSV() {
    if (!sessionId || exporting) return;
    setExporting(true);
    try {
      await generateReport(sessionId);
      const rep = await getReportBySession(sessionId);
      if (rep) setReport(rep);
    } catch (e) {
      console.error('[BatchSummary] export failed:', e);
    } finally {
      setExporting(false);
    }
  }

  const session = progress?.session;

  const statsConfig = [
    { value: progress?.confirmedCount ?? 0, label: 'Classified',         icon: '✓', color: '#008236', bg: '#F0FDF4', iconBg: '#008236' },
    { value: progress?.rejectedCount ?? 0,  label: 'Rejected',           icon: '✕', color: '#DC2626', bg: '#FEF2F2', iconBg: '#DC2626' },
    { value: progress?.totalSamples ?? 0,   label: 'Total Submitted',    icon: '▦', color: '#1D4ED8', bg: '#EFF6FF', iconBg: '#1D4ED8' },
    { value: progress?.correctionCount ?? 0,label: 'Expert Corrections', icon: '◷', color: '#B45309', bg: '#FFF8E8', iconBg: '#D97706' },
  ];

  const asvArr = [1, 2, 3, 4, 5, 6, 7].map((i) => progress?.asvDistribution[i] ?? 0);

  const { HIGH, INTERMEDIATE, LOW } = progress?.gtDistribution ?? { HIGH: 0, INTERMEDIATE: 0, LOW: 0 };
  const gtSlices: GTSlice[] = [
    { value: HIGH,         color: '#EF4444', label: 'High GT' },
    { value: INTERMEDIATE, color: '#F59E0B', label: 'Intermediate GT' },
    { value: LOW,          color: '#3B82F6', label: 'Low GT' },
  ];

  const generatedStr = report?.generated_at
    ? new Date(report.generated_at).toLocaleString()
    : '—';

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Batch Summary</Text>
          <Text style={styles.headerSubtitle}>
            {session?.batch_id ? `Session ${session.batch_id}` : '—'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={styles.reportBanner}>
          <View style={styles.reportIconBox}>
            <Text style={{ fontSize: 18 }}>📄</Text>
          </View>
          <View>
            <Text style={styles.reportBannerTitle}>Batch Summary Report</Text>
            <Text style={styles.reportBannerSub}>Generated: {generatedStr}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Session Information</Text>
          {[
            { label: 'Session Name:',    value: session?.name ?? '—' },
            { label: 'Session ID:',      value: session?.batch_id ?? '—' },
            { label: 'Evaluator ID:',    value: session?.evaluator_id ?? '—' },
            { label: 'Evaluation Date:', value: session?.evaluation_date ?? '—' },
          ].map(({ label, value }) => (
            <View key={label} style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>{label}</Text>
              <Text style={styles.sessionValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {statsConfig.map((s, i) => (
            <View key={i} style={{ width: '48%' }}>
              <View style={[styles.statCard, { backgroundColor: s.bg }]}>
                <View style={[styles.statIconBox, { backgroundColor: s.iconBg }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{s.icon}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: s.color }}>{s.value}</Text>
                  <Text style={{ fontSize: 12 }}>{s.label}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <AnimatedBarChart distribution={asvArr} />
        <PieChart slices={gtSlices} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Treatment Parameters</Text>
          <View style={styles.treatmentGrid}>
            {[
              { label: 'KOH:',          value: session ? `${session.koh_concentration}%` : '—' },
              { label: 'Duration:',     value: session ? `${session.incubation_duration}h` : '—' },
              { label: 'Temperature:',  value: session ? `${session.incubation_temperature}°C` : '—' },
              { label: 'Protocol:',     value: 'IRRI Standard' },
            ].map(({ label, value }) => (
              <View key={label} style={styles.treatmentItem}>
                <Text style={styles.treatmentLabel}>{label}</Text>
                <Text style={styles.treatmentValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && { opacity: 0.6 }]}
          onPress={handleExportCSV}
          disabled={exporting}
        >
          <Text style={styles.exportIcon}>⬇</Text>
          <Text style={styles.exportBtnText}>{exporting ? 'Exporting...' : 'Export CSV'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() =>
            navigation.navigate('UploadReport', {
              sessionId,
              sessionName: session?.name,
            })
          }
        >
          <Text style={styles.uploadIcon}>⬆</Text>
          <Text style={styles.uploadBtnText}>Upload Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    backgroundColor: GREEN,
    paddingTop: 50,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle:    { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  reportBanner: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportIconBox: {
    width: 40,
    height: 40,
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBannerTitle: { fontSize: 14, fontWeight: '700', color: '#15803D' },
  reportBannerSub:   { fontSize: 12, color: '#16A34A', marginTop: 2 },

  card:      { backgroundColor: '#fff', padding: 16, borderRadius: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },

  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sessionLabel: { fontSize: 13, color: '#6B7280' },
  sessionValue: { fontSize: 13, fontWeight: '500', color: '#111827', textAlign: 'right', flexShrink: 1, marginLeft: 8 },

  statCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  yAxisLabel: { fontSize: 11, color: '#9CA3AF', lineHeight: 14 },

  treatmentGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  treatmentItem: { width: '50%', flexDirection: 'row', gap: 4, marginBottom: 8 },
  treatmentLabel: { fontSize: 13, color: '#6B7280' },
  treatmentValue: { fontSize: 13, fontWeight: '600' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  exportBtn: {
    flex: 1,
    backgroundColor: GREEN,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  exportIcon:    { color: '#fff', fontSize: 16 },
  exportBtnText: { color: '#fff', fontWeight: '700' },

  uploadBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  uploadIcon:    { color: '#374151', fontSize: 16 },
  uploadBtnText: { color: '#374151', fontWeight: '700' },

  pieLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 14,
  },
  legendItemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:     { width: 10, height: 10, borderRadius: 5 },
  legendText:    { fontSize: 12, color: '#374151', fontWeight: '500' },
});
