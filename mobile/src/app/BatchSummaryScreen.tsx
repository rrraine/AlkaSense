import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Animated, ActivityIndicator, Alert,
} from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import {
  getSessionSummaryData,
  exportSessionSummaryCsv,
  generateReport,
  getReportForSession,
} from '../services/ReportService';
import type { SessionReport } from '../db/repositories/SessionReportRepository';

const GREEN = '#008236';
const CHART_HEIGHT = 140;
const ASV_Y_LABELS = [8, 6, 4, 2, 0];

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arc(cx: number, cy: number, r: number, start: number, end: number) {
  const startPt = polar(cx, cy, r, end);
  const endPt = polar(cx, cy, r, start);
  const largeArc = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 0 ${endPt.x} ${endPt.y} Z`;
}

const SIZE = 170;
const R = SIZE / 2;
const GT_COLORS = { 'High GT': '#EF4444', 'Intermediate GT': '#F59E0B', 'Low GT': '#3B82F6' };

function PieChart({ gtDistribution }: { gtDistribution: Record<string, number> }) {
  const slices = Object.entries(gtDistribution)
    .filter(([, v]) => v > 0)
    .map(([label, value]) => ({ label, value, color: GT_COLORS[label as keyof typeof GT_COLORS] ?? '#6B7280' }));
  const total = slices.reduce((a, b) => a + b.value, 0);
  let cursor = 0;
  const rendered = slices.map((s) => {
    const angle = (s.value / Math.max(total, 1)) * 360;
    const midAngle = cursor + angle / 2;
    const slice = { ...s, start: cursor, end: cursor + angle, midAngle };
    cursor += angle;
    return slice;
  });
  const LABEL_R = R * 0.62;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>GT Classification Distribution</Text>
      <View style={{ alignItems: 'center' }}>
        <Svg width={SIZE + 80} height={SIZE} viewBox={`-40 0 ${SIZE + 80} ${SIZE}`}>
          {rendered.map((s, i) => <Path key={i} d={arc(R, R, R, s.start, s.end)} fill={s.color} />)}
          {rendered.map((s, i) => {
            const pt = polar(R, R, LABEL_R, s.midAngle);
            return <SvgText key={`lbl-${i}`} x={pt.x} y={pt.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{`${s.value}%`}</SvgText>;
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

function AnimatedBarChart({ asvDistribution }: { asvDistribution: number[] }) {
  const ASV_MAX = Math.max(...asvDistribution, 1);
  const animValues = useRef(asvDistribution.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const animations = animValues.map((v, i) =>
      Animated.spring(v, { toValue: (asvDistribution[i] / ASV_MAX) * CHART_HEIGHT, friction: 7, tension: 50, delay: i * 80, useNativeDriver: false })
    );
    Animated.stagger(60, animations).start();
  }, [JSON.stringify(asvDistribution)]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>ASV Distribution</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ height: CHART_HEIGHT + 20, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 4, paddingBottom: 20 }}>
          {ASV_Y_LABELS.map((label) => <Text key={label} style={styles.yAxisLabel}>{label}</Text>)}
        </View>
        <View style={{ flex: 1, flexDirection: 'row', height: CHART_HEIGHT + 20, alignItems: 'flex-end' }}>
          {asvDistribution.map((_, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Animated.View style={{ width: 22, height: animValues[i], backgroundColor: '#16A34A', borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
              <Text style={{ fontSize: 12, marginTop: 4, color: '#374151' }}>{i + 1}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function BatchSummaryScreen({ navigation, route }: any) {
  const sessionId = route?.params?.sessionId;
  const [summaryData, setSummaryData] = useState<any>(null);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        if (!sessionId) return;
        setLoading(true);
        try {
          const [data, existingReport] = await Promise.all([
            getSessionSummaryData(sessionId),
            getReportForSession(sessionId),
          ]);
          if (!cancelled) {
            setSummaryData(data);
            setReport(existingReport);
          }
        } catch (err) {
          console.error('BatchSummaryScreen load error:', err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return () => { cancelled = true; };
    }, [sessionId])
  );

  // Per SDD §4.2: "Generate Report" closes Active session + generates report + CSV.
  // Shows confirmation dialog for irreversible closure if session is still Active.
  async function handleGenerateReport() {
    const session = summaryData?.session;
    const isActive = session?.status === 'Active';

    const confirmed = await new Promise<boolean>((resolve) => {
      if (isActive) {
        Alert.alert(
          'Close Session & Generate Report',
          'This will permanently close the session. No further evaluations can be added after closure. Export generation will begin immediately.\n\nProceed?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Confirm & Generate', style: 'default', onPress: () => resolve(true) },
          ]
        );
      } else {
        // Session already Completed — no confirmation needed, just generate.
        resolve(true);
      }
    });

    if (!confirmed) return;

    setGenerating(true);
    try {
      const generated = await generateReport(sessionId);
      setReport(generated);
      // Refresh summary so session status updates to Completed in the header
      const data = await getSessionSummaryData(sessionId);
      setSummaryData(data);
    } catch (err: any) {
      Alert.alert('Report Generation Failed', err?.message ?? 'Could not generate report.');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={GREEN} size="large" />
      </View>
    );
  }

  const { session, stats, asvDistribution, gtDistributionPct } = summaryData ?? {
    session: null, stats: { total: 0, classified: 0, rejected: 0, corrections: 0 },
    asvDistribution: [0, 0, 0, 0, 0, 0, 0], gtDistributionPct: {},
  };

  const STATS = [
    { value: stats.classified, label: 'Classified', icon: '✓', color: '#008236', bg: '#F0FDF4', iconBg: '#008236' },
    { value: stats.rejected, label: 'Rejected', icon: '✕', color: '#DC2626', bg: '#FEF2F2', iconBg: '#DC2626' },
    { value: stats.total, label: 'Total Submitted', icon: '▦', color: '#1D4ED8', bg: '#EFF6FF', iconBg: '#1D4ED8' },
    { value: stats.corrections, label: 'Expert Corrections', icon: '◷', color: '#B45309', bg: '#FFF8E8', iconBg: '#D97706' },
  ];

  const reportExists = report !== null;
  const allConfirmed = stats.classified === stats.total && stats.total > 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Batch Summary</Text>
          <Text style={styles.headerSubtitle}>Session {session?.id ?? sessionId}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={styles.reportBanner}>
          <View style={styles.reportIconBox}><Text style={{ fontSize: 18 }}>📄</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportBannerTitle}>
              {reportExists ? 'Report Generated' : 'Batch Summary Report'}
            </Text>
            <Text style={styles.reportBannerSub}>
              {reportExists
                ? `Generated: ${new Date(report!.generated_at).toLocaleString('en-US')}`
                : session?.status === 'Active'
                  ? 'Session is still active — generate to close and export'
                  : 'Report not yet generated'}
            </Text>
          </View>
        </View>

        {session && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Session Information</Text>
            {[
              { label: 'Session Name:', value: session.name },
              { label: 'Session ID:', value: session.id },
              { label: 'Batch ID:', value: session.batch_identifier },
              { label: 'KOH:', value: `${session.koh_concentration}%` },
              { label: 'Duration:', value: `${session.incubation_duration}h` },
              { label: 'Temperature:', value: `${session.incubation_temp}°C` },
              { label: 'Status:', value: session.status },
            ].map(({ label, value }) => (
              <View key={label} style={styles.sessionRow}>
                <Text style={styles.sessionLabel}>{label}</Text>
                <Text style={styles.sessionValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {STATS.map((s, i) => (
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

        <AnimatedBarChart asvDistribution={asvDistribution} />
        <PieChart gtDistribution={gtDistributionPct} />

        {/* Progress hint when not all samples confirmed */}
        {!allConfirmed && !reportExists && (
          <View style={styles.hintBanner}>
            <Text style={styles.hintText}>
              ⚠ {stats.total - stats.classified} sample(s) not yet confirmed. All samples must be confirmed before generating a report.
            </Text>
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.footer}>
        {reportExists ? (
          <>
            {/* Report exists: show Export + Upload */}
            <TouchableOpacity
              style={[styles.exportBtn, exporting && { opacity: 0.7 }]}
              disabled={exporting}
              onPress={async () => {
                setExporting(true);
                try {
                  await exportSessionSummaryCsv(sessionId);
                } catch (err: any) {
                  Alert.alert('Export Failed', err?.message ?? 'Could not export CSV.');
                } finally {
                  setExporting(false);
                }
              }}
            >
              {exporting
                ? <ActivityIndicator color="#fff" style={{ marginRight: 6 }} />
                : <Text style={styles.exportIcon}>⬇</Text>}
              <Text style={styles.exportBtnText}>{exporting ? 'Exporting…' : 'Export CSV'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.uploadBtn, report?.upload_status === 'UPLOADED' && { opacity: 0.5 }]}
              onPress={() => navigation.navigate('UploadReport', { sessionId })}
            >
              <Text style={styles.uploadIcon}>⬆</Text>
              <Text style={styles.uploadBtnText}>
                {report?.upload_status === 'UPLOADED' ? 'Uploaded ✓' : 'Upload Report'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          /* No report yet: show Generate Report button */
          <TouchableOpacity
            style={[styles.generateBtn, (generating || !allConfirmed) && { opacity: 0.6 }]}
            disabled={generating || !allConfirmed}
            onPress={handleGenerateReport}
          >
            {generating
              ? <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
              : <Text style={styles.generateIcon}>📄</Text>}
            <Text style={styles.generateBtnText}>
              {generating
                ? 'Generating Report…'
                : session?.status === 'Active'
                  ? 'Generate Report & Close Session'
                  : 'Generate Report'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: GREEN, paddingTop: 50, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  reportBanner: { backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  reportIconBox: { width: 40, height: 40, backgroundColor: '#DCFCE7', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reportBannerTitle: { fontSize: 14, fontWeight: '700', color: '#15803D' },
  reportBannerSub: { fontSize: 12, color: '#16A34A', marginTop: 2 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sessionLabel: { fontSize: 13, color: '#6B7280' },
  sessionValue: { fontSize: 13, fontWeight: '500', color: '#111827', textAlign: 'right', flexShrink: 1, marginLeft: 8 },
  statCard: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, alignItems: 'center' },
  statIconBox: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  yAxisLabel: { fontSize: 11, color: '#9CA3AF', lineHeight: 14 },
  hintBanner: { backgroundColor: '#FFF8E8', borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A', padding: 14 },
  hintText: { fontSize: 13, color: '#B45309', lineHeight: 20 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', padding: 14, gap: 12, borderTopWidth: 1, borderColor: '#E5E7EB' },
  generateBtn: { flex: 1, backgroundColor: GREEN, padding: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  generateIcon: { fontSize: 16 },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  exportBtn: { flex: 1, backgroundColor: GREEN, padding: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  exportIcon: { color: '#fff', fontSize: 16 },
  exportBtnText: { color: '#fff', fontWeight: '700' },
  uploadBtn: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', padding: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  uploadIcon: { color: '#374151', fontSize: 16 },
  uploadBtnText: { color: '#374151', fontWeight: '700' },
  pieLegendRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 12, gap: 14 },
  legendItemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#374151', fontWeight: '500' },
});
