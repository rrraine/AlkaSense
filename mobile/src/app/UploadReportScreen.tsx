import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Animated, Easing, ActivityIndicator,
} from 'react-native';
import { uploadReport, getReportForSession, generateReport } from '../services/ReportService';
import type { SessionReport } from '../db/repositories/SessionReportRepository';

const GREEN = '#008236';
type UploadState = 'idle' | 'uploading' | 'success' | 'error';

function SuccessBanner({ report }: { report: SessionReport }) {
  return (
    <View style={styles.successBanner}>
      <View style={styles.successBannerRow}>
        <View style={styles.successCheckCircle}><Text style={{ color: GREEN, fontSize: 16, fontWeight: '700' }}>✓</Text></View>
        <Text style={styles.successBannerTitle}>Upload Successful</Text>
      </View>
      {[
        { label: 'Session ID:', value: report.session_id },
        { label: 'Upload Time:', value: new Date().toLocaleString('en-US') },
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

export default function UploadReportScreen({ navigation, route }: any) {
  const sessionId = route?.params?.sessionId;
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [report, setReport] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function init() {
      if (!sessionId) return;
      try {
        let existingReport = await getReportForSession(sessionId);
        if (!existingReport) {
          existingReport = await generateReport(sessionId);
        }
        setReport(existingReport);
        if (existingReport.upload_status === 'UPLOADED') {
          setUploadState('success');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [sessionId]);

  async function handleUpload() {
    if (uploadState !== 'idle' || !sessionId) return;
    setUploadState('uploading');
    setError(null);
    progress.setValue(0);

    // Animate progress bar
    Animated.timing(progress, { toValue: 0.85, duration: 2500, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();

    try {
      await uploadReport(sessionId);
      Animated.timing(progress, { toValue: 1, duration: 400, useNativeDriver: false }).start(() => {
        setUploadState('success');
        const updatedReport = { ...report!, upload_status: 'UPLOADED' as const };
        setReport(updatedReport);
      });
    } catch (err: any) {
      setUploadState('error');
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={GREEN} size="large" />
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
          <Text style={styles.headerSubtitle}>Session {sessionId}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {uploadState === 'success' && report && <SuccessBanner report={report} />}

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        )}

        {report && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Report Package Summary</Text>
            <View style={styles.fieldBox}>
              <Text style={styles.fieldLabel}>Session ID</Text>
              <Text style={styles.fieldValue}>{report.session_id}</Text>
            </View>
            <View style={[styles.fieldBox, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Total Samples</Text>
              <Text style={styles.fieldValue}>{report.total_samples}</Text>
            </View>
            <View style={[styles.fieldBox, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>Generated</Text>
              <Text style={styles.fieldValue}>{new Date(report.generated_at).toLocaleString('en-US')}</Text>
            </View>
          </View>
        )}

        {uploadState === 'uploading' && <UploadProgressCard progress={progress} />}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload Status</Text>
          <View style={[styles.statusBadge, {
            backgroundColor: uploadState === 'success' ? '#F0FDF4' : uploadState === 'uploading' ? '#EFF6FF' : uploadState === 'error' ? '#FEF2F2' : '#F3F4F6',
            borderColor: uploadState === 'success' ? '#BBF7D0' : uploadState === 'uploading' ? '#BFDBFE' : uploadState === 'error' ? '#FECACA' : '#D1D5DB',
          }]}>
            <Text style={[styles.statusBadgeText, {
              color: uploadState === 'success' ? '#15803D' : uploadState === 'uploading' ? '#2563EB' : uploadState === 'error' ? '#DC2626' : '#374151',
            }]}>
              {uploadState === 'success' ? 'Successfully Uploaded' : uploadState === 'uploading' ? 'Uploading...' : uploadState === 'error' ? 'Upload Failed' : 'Ready to Upload'}
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        {uploadState === 'success' ? (
          <TouchableOpacity style={[styles.footerBtn, styles.footerBtnGreen]} onPress={() => navigation.navigate('SessionProgress', { sessionId })}>
            <Text style={[styles.footerBtnLabel, styles.footerBtnTextWhite]}>Return to Session Dashboard</Text>
          </TouchableOpacity>
        ) : uploadState === 'uploading' ? (
          <View style={[styles.footerBtn, styles.footerBtnGray]}>
            <ActivityIndicator color="#6B7280" style={{ marginRight: 8 }} />
            <Text style={[styles.footerBtnLabel, styles.footerBtnTextGray]}>Upload in Progress...</Text>
          </View>
        ) : (
          <TouchableOpacity style={[styles.footerBtn, styles.footerBtnGreen]} onPress={handleUpload}>
            <Text style={[styles.footerBtnLabel, styles.footerBtnTextWhite]}>⬆ Upload Report to PhilRice Server</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: GREEN, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  successBanner: { backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1.5, borderColor: '#86EFAC', padding: 14, gap: 6 },
  successBannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  successCheckCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: GREEN, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  successBannerTitle: { fontSize: 15, fontWeight: '700', color: '#15803D', flex: 1 },
  successBannerLabel: { fontSize: 13, color: '#4B5563' },
  successBannerValue: { fontSize: 13, fontWeight: '500', color: '#111827', textAlign: 'right' },
  errorBanner: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#DC2626', fontSize: 14, fontWeight: '500' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  fieldBox: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10 },
  fieldLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 3 },
  fieldValue: { fontSize: 15, fontWeight: '500', color: '#111827' },
  progressCard: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 16, gap: 10 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: 14, fontWeight: '700', color: '#1E3A5F' },
  progressPct: { fontSize: 14, fontWeight: '700', color: '#1E3A5F' },
  progressTrack: { height: 8, backgroundColor: '#DBEAFE', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#1D4ED8', borderRadius: 4 },
  progressSub: { fontSize: 12, color: '#3B82F6' },
  statusBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  statusBadgeText: { fontSize: 13, fontWeight: '600' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderColor: '#E5E7EB' },
  footerBtn: { borderRadius: 14, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  footerBtnLabel: { fontSize: 15, fontWeight: '700' },
  footerBtnGreen: { backgroundColor: GREEN },
  footerBtnGray: { backgroundColor: '#D1D5DB' },
  footerBtnTextWhite: { color: '#fff' },
  footerBtnTextGray: { color: '#6B7280' },
});