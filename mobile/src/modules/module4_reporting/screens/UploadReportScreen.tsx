import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getReportBySession } from '../services/ReportExportService';
import { initiateUpload, retryUpload } from '../services/ReportUploadService';
import { SessionReportRecord } from '../../../shared/types/report.types';

const GREEN = '#008236';

type UploadState = 'idle' | 'uploading' | 'success' | 'failed';

function filename(path: string) {
  return path.split('/').pop() ?? path;
}

function SuccessBanner({ sessionId, uploadedAt }: { sessionId: string; uploadedAt: string }) {
  return (
    <View style={styles.successBanner}>
      <View style={styles.successBannerRow}>
        <View style={styles.successCheckCircle}>
          <Text style={{ color: GREEN, fontSize: 16, fontWeight: '700' }}>✓</Text>
        </View>
        <Text style={styles.successBannerTitle}>Upload Successful</Text>
      </View>
      {[
        { label: 'Session ID:',    value: sessionId },
        { label: 'Upload Time:',   value: new Date(uploadedAt).toLocaleString() },
        { label: 'File Integrity:', value: 'Confirmed ✓' },
      ].map(({ label, value }) => (
        <View key={label} style={styles.successBannerRow}>
          <Text style={styles.successBannerLabel}>{label}</Text>
          <Text style={styles.successBannerValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function ReportPackageSummary({
  sessionName,
  report,
}: {
  sessionName: string;
  report: SessionReportRecord | null;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Report Package Summary</Text>

      <View style={styles.fieldBox}>
        <Text style={styles.fieldLabel}>Session Name</Text>
        <Text style={styles.fieldValue}>{sessionName || '—'}</Text>
      </View>

      <View style={[styles.fieldBox, { marginTop: 10 }]}>
        <Text style={styles.fieldLabel}>Report Generation Time</Text>
        <Text style={styles.fieldValue}>
          {report?.generated_at ? new Date(report.generated_at).toLocaleString() : '—'}
        </Text>
      </View>

      {report && (
        <View style={styles.fileRow}>
          <View style={[styles.fileCard, styles.fileCardPurple, { flex: 1 }]}>
            <Text style={styles.fileIconPurple}>📊</Text>
            <Text style={[styles.fileCardLabel, { color: '#7C3AED' }]}>CSV Report</Text>
            <Text style={[styles.fileCardFilename, { color: '#6D28D9' }]} numberOfLines={1}>
              {filename(report.csv_path)}
            </Text>
          </View>
        </View>
      )}

      {!report && (
        <View style={[styles.fieldBox, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel, { color: '#DC2626' }]}>
            No report generated yet. Use Batch Summary → Export CSV first.
          </Text>
        </View>
      )}

      {report && (
        <View style={[styles.fieldBox, { marginTop: 10 }]}>
          <Text style={styles.fieldLabel}>Upload Attempts</Text>
          <Text style={styles.fieldValue}>{report.upload_attempts}</Text>
        </View>
      )}
    </View>
  );
}

function UploadProgressCard({ progress }: { progress: Animated.Value }) {
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) => setDisplayPct(Math.round(value * 100)));
    return () => progress.removeListener(id);
  }, [progress]);

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Uploading Report Package</Text>
        <Text style={styles.progressPct}>{displayPct}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: barWidth }]} />
      </View>
      <Text style={styles.progressSub}>Transmitting to PhilRice server...</Text>
    </View>
  );
}

function UploadStatusCard({ state, attempts }: { state: UploadState; attempts: number }) {
  const badge = {
    idle:      { label: 'Ready to Upload',       bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
    uploading: { label: 'Uploading...',           bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
    success:   { label: 'Successfully Uploaded',  bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
    failed:    { label: 'Upload Failed',          bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' },
  }[state];

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Upload Status</Text>
      <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
        <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
      </View>
      {attempts > 0 && (
        <Text style={[styles.fieldLabel, { marginTop: 8 }]}>
          {attempts} attempt{attempts !== 1 ? 's' : ''} made
        </Text>
      )}
    </View>
  );
}

export default function UploadReportScreen({ navigation, route }: any) {
  const { sessionId, sessionName = '' } = route?.params ?? {};

  const [uploadState, setUploadState]   = useState<UploadState>('idle');
  const [report, setReport]             = useState<SessionReportRecord | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [uploadedAt, setUploadedAt]     = useState('');
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!sessionId) { setLoadingReport(false); return; }
    getReportBySession(sessionId)
      .then((rep) => {
        if (rep) {
          setReport(rep);
          if (rep.upload_status === 'UPLOADED') setUploadState('success');
          else if (rep.upload_status === 'FAILED') setUploadState('failed');
        }
      })
      .catch(console.error)
      .finally(() => setLoadingReport(false));
  }, [sessionId]);

  async function handleUpload() {
    if (!sessionId || !report || uploadState === 'uploading') return;
    setUploadState('uploading');
    progress.setValue(0);

    Animated.timing(progress, {
      toValue: 0.9,
      duration: 2500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    try {
      await initiateUpload(sessionId, {
        csv_path: report.csv_path,
        generated_at: report.generated_at,
      });
      progress.setValue(1);
      const now = new Date().toISOString();
      setUploadedAt(now);
      setUploadState('success');
      const updated = await getReportBySession(sessionId);
      if (updated) setReport(updated);
    } catch (e: any) {
      progress.setValue(0);
      setUploadState('failed');
      const isNetworkError =
        e?.code === 'ERR_NETWORK' ||
        e?.message?.toLowerCase().includes('network') ||
        e?.message?.toLowerCase().includes('econnrefused');
      console.error('[UploadReport] upload failed:', e?.message ?? e);
      Alert.alert(
        'Upload Failed',
        isNetworkError
          ? 'Could not reach the PhilRice server. Check that the backend is running and EXPO_PUBLIC_API_URL is set correctly. The report is saved locally — tap Retry when connectivity is restored.'
          : `Upload error: ${e?.message ?? 'Unknown error'}. The report is saved locally.`
      );
      const updated = await getReportBySession(sessionId);
      if (updated) setReport(updated);
    }
  }

  async function handleRetry() {
    if (!sessionId) return;
    setUploadState('uploading');
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 0.9,
      duration: 2500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
    try {
      await retryUpload(sessionId);
      progress.setValue(1);
      setUploadedAt(new Date().toISOString());
      setUploadState('success');
      const updated = await getReportBySession(sessionId);
      if (updated) setReport(updated);
    } catch (e: any) {
      progress.setValue(0);
      setUploadState('failed');
      console.error('[UploadReport] retry failed:', e?.message ?? e);
      const updated = await getReportBySession(sessionId);
      if (updated) setReport(updated);
    }
  }

  const footerConfig = {
    idle: {
      label:    'Upload Report to PhilRice Server',
      icon:     '⬆',
      style:    styles.footerBtnGreen,
      textStyle: styles.footerBtnTextWhite,
      onPress:  handleUpload,
      disabled: !report,
    },
    uploading: {
      label:    'Upload in Progress...',
      icon:     '',
      style:    styles.footerBtnGray,
      textStyle: styles.footerBtnTextGray,
      onPress:  () => {},
      disabled: true,
    },
    success: {
      label:    'Return to Session Dashboard',
      icon:     '',
      style:    styles.footerBtnGreen,
      textStyle: styles.footerBtnTextWhite,
      onPress:  () => navigation.goBack(),
      disabled: false,
    },
    failed: {
      label:    'Retry Upload',
      icon:     '↺',
      style:    styles.footerBtnOrange,
      textStyle: styles.footerBtnTextWhite,
      onPress:  handleRetry,
      disabled: false,
    },
  }[uploadState];

  if (loadingReport) {
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
          <Text style={styles.headerTitle}>Report Upload</Text>
          <Text style={styles.headerSubtitle}>{sessionName || '—'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {uploadState === 'success' && (
          <SuccessBanner sessionId={sessionId ?? ''} uploadedAt={uploadedAt || new Date().toISOString()} />
        )}

        <ReportPackageSummary sessionName={sessionName} report={report} />

        {uploadState === 'uploading' && <UploadProgressCard progress={progress} />}

        <UploadStatusCard state={uploadState} attempts={report?.upload_attempts ?? 0} />

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerBtn, footerConfig.style, footerConfig.disabled && { opacity: 0.5 }]}
          onPress={footerConfig.onPress}
          disabled={footerConfig.disabled}
          activeOpacity={footerConfig.disabled ? 1 : 0.8}
        >
          {footerConfig.icon ? <Text style={footerConfig.textStyle}>{footerConfig.icon}</Text> : null}
          <Text style={[styles.footerBtnLabel, footerConfig.textStyle]}>{footerConfig.label}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    backgroundColor: GREEN,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle:    { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  successBanner: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    padding: 14,
    gap: 6,
  },
  successBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  successBannerTitle: { fontSize: 15, fontWeight: '700', color: '#15803D', flex: 1 },
  successBannerLabel: { fontSize: 13, color: '#4B5563' },
  successBannerValue: { fontSize: 13, fontWeight: '500', color: '#111827', textAlign: 'right' },

  card:      { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  fieldBox:     { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10 },
  fieldLabel:   { fontSize: 12, color: '#9CA3AF', marginBottom: 3 },
  fieldValue:   { fontSize: 15, fontWeight: '500', color: '#111827' },

  fileRow:        { flexDirection: 'row', gap: 10, marginTop: 12 },
  fileCard:       { flex: 1, borderRadius: 10, padding: 12, gap: 4 },
  fileCardBlue:   { backgroundColor: '#EFF6FF' },
  fileCardPurple: { backgroundColor: '#F5F3FF' },
  fileIconBlue:   { fontSize: 18 },
  fileIconPurple: { fontSize: 18 },
  fileCardLabel:  { fontSize: 12, fontWeight: '500' },
  fileCardFilename: { fontSize: 11, fontWeight: '500' },

  progressCard: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 16, gap: 10 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: 14, fontWeight: '700', color: '#1E3A5F' },
  progressPct:   { fontSize: 14, fontWeight: '700', color: '#1E3A5F' },
  progressTrack: { height: 8, backgroundColor: '#DBEAFE', borderRadius: 4, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: '#1D4ED8', borderRadius: 4 },
  progressSub:   { fontSize: 12, color: '#3B82F6' },

  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusBadgeText: { fontSize: 13, fontWeight: '600' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  footerBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  footerBtnLabel:     { fontSize: 15, fontWeight: '700' },
  footerBtnGreen:     { backgroundColor: GREEN },
  footerBtnGray:      { backgroundColor: '#D1D5DB' },
  footerBtnOrange:    { backgroundColor: '#D97706' },
  footerBtnTextWhite: { color: '#fff' },
  footerBtnTextGray:  { color: '#6B7280' },
});
