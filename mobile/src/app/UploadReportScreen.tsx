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
} from 'react-native';

const GREEN = '#008236';

type UploadState = 'idle' | 'uploading' | 'success';

const SESSION = {
  sessionId: 'ALKA-2026-041',
  sessionName: 'Spring Harvest 2026',
  reportGeneratedTime: '5/15/2026, 6:34:15 PM',
  uploadTime: '5/16/2026, 6:37:14 PM',         // placeholder — set on success
  fileIntegrity: 'Confirmed',
};

const FILES = {
  pdf: { label: 'PDF Report', size: '245 KB' },
  csv: { label: 'CSV Data',   size: '18 KB'  },
};

/** Green success banner shown after upload */
function SuccessBanner() {
  return (
    <View style={styles.successBanner}>
      <View style={styles.successBannerRow}>
        <View style={styles.successCheckCircle}>
          <Text style={{ color: GREEN, fontSize: 16, fontWeight: '700' }}>✓</Text>
        </View>
        <Text style={styles.successBannerTitle}>Upload Successful</Text>
      </View>

      {[
        { label: 'Session ID:',    value: SESSION.sessionId },
        { label: 'Upload Time:',   value: SESSION.uploadTime },
        { label: 'File Integrity:', value: `${SESSION.fileIntegrity} ✓` },
      ].map(({ label, value }) => (
        <View key={label} style={styles.successBannerRow}>
          <Text style={styles.successBannerLabel}>{label}</Text>
          <Text style={styles.successBannerValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Report package summary card — same across all states */
function ReportPackageSummary() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Report Package Summary</Text>

      {/* Session Name */}
      <View style={styles.fieldBox}>
        <Text style={styles.fieldLabel}>Session Name</Text>
        <Text style={styles.fieldValue}>{SESSION.sessionName}</Text>
      </View>

      {/* Report Generation Time */}
      <View style={[styles.fieldBox, { marginTop: 10 }]}>
        <Text style={styles.fieldLabel}>Report Generation Time</Text>
        <Text style={styles.fieldValue}>{SESSION.reportGeneratedTime}</Text>
      </View>

      {/* File cards */}
      <View style={styles.fileRow}>
        {/* PDF */}
        <View style={[styles.fileCard, styles.fileCardBlue]}>
          <Text style={styles.fileIconBlue}>📄</Text>
          <Text style={[styles.fileCardLabel, { color: '#2563EB' }]}>{FILES.pdf.label}</Text>
          <Text style={[styles.fileCardSize,  { color: '#1D4ED8' }]}>{FILES.pdf.size}</Text>
        </View>

        {/* CSV */}
        <View style={[styles.fileCard, styles.fileCardPurple]}>
          <Text style={styles.fileIconPurple}>📄</Text>
          <Text style={[styles.fileCardLabel, { color: '#7C3AED' }]}>{FILES.csv.label}</Text>
          <Text style={[styles.fileCardSize,  { color: '#6D28D9' }]}>{FILES.csv.size}</Text>
        </View>
      </View>
    </View>
  );
}

/** Animated progress bar card — visible only while uploading */
function UploadProgressCard({ progress }: { progress: Animated.Value }) {
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) =>
      setDisplayPct(Math.round(value * 100))
    );
    return () => progress.removeListener(id);
  }, [progress]);

  const barWidth = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Uploading Report Package</Text>
        <Text style={styles.progressPct}>{displayPct}%</Text>
      </View>

      {/* Track */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: barWidth }]} />
      </View>

      <Text style={styles.progressSub}>Transmitting to PhilRice server...</Text>
    </View>
  );
}

/** Upload status badge card */
function UploadStatusCard({ state }: { state: UploadState }) {
  const badge = {
    idle:      { label: 'Ready to Upload',      bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
    uploading: { label: 'Uploading...',          bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
    success:   { label: 'Successfully Uploaded', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  }[state];

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Upload Status</Text>
      <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
        <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
      </View>
    </View>
  );
}

export default function UploadReportScreen({ navigation }: any) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const progress = useRef(new Animated.Value(0)).current;

  // Simulate upload: animate progress bar from 0→1 over ~3 s, then show success
  function handleUpload() {
    if (uploadState !== 'idle') return;

    setUploadState('uploading');
    progress.setValue(0);

    Animated.timing(progress, {
      toValue: 1,
      duration: 3000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      setUploadState('success');
    });
  }

  function handleReturnToDashboard() {
    navigation.goBack();   // replace with your actual navigation target
  }

  // ── Footer button config per state ──
  const footer = {
    idle: {
      label:    'Upload Report to PhilRice Server',
      icon:     '⬆',
      style:    styles.footerBtnGreen,
      textStyle: styles.footerBtnTextWhite,
      onPress:  handleUpload,
      disabled: false,
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
      onPress:  handleReturnToDashboard,
      disabled: false,
    },
  }[uploadState];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Report Upload</Text>
          <Text style={styles.headerSubtitle}>Session {SESSION.sessionId}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>

        {/* Success banner — only after upload */}
        {uploadState === 'success' && <SuccessBanner />}

        {/* Report package summary — always visible */}
        <ReportPackageSummary />

        {/* Progress card — only while uploading */}
        {uploadState === 'uploading' && (
          <UploadProgressCard progress={progress} />
        )}

        {/* Status badge — always visible */}
        <UploadStatusCard state={uploadState} />

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerBtn, footer.style]}
          onPress={footer.onPress}
          disabled={footer.disabled}
          activeOpacity={footer.disabled ? 1 : 0.8}
        >
          {footer.icon ? <Text style={footer.textStyle}>{footer.icon}</Text> : null}
          <Text style={[styles.footerBtnLabel, footer.textStyle]}>{footer.label}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  // ── Header ──
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

  // ── Success banner ──
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

  // ── Generic card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  // ── Field boxes ──
  fieldBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
  },
  fieldLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 3 },
  fieldValue: { fontSize: 15, fontWeight: '500', color: '#111827' },

  // ── File cards ──
  fileRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  fileCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  fileCardBlue:   { backgroundColor: '#EFF6FF' },
  fileCardPurple: { backgroundColor: '#F5F3FF' },
  fileIconBlue:   { fontSize: 18 },
  fileIconPurple: { fontSize: 18 },
  fileCardLabel:  { fontSize: 12, fontWeight: '500' },
  fileCardSize:   { fontSize: 18, fontWeight: '700' },

  // ── Progress card ──
  progressCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: { fontSize: 14, fontWeight: '700', color: '#1E3A5F' },
  progressPct:   { fontSize: 14, fontWeight: '700', color: '#1E3A5F' },
  progressTrack: {
    height: 8,
    backgroundColor: '#DBEAFE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1D4ED8',
    borderRadius: 4,
  },
  progressSub: { fontSize: 12, color: '#3B82F6' },

  // ── Status badge ──
  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusBadgeText: { fontSize: 13, fontWeight: '600' },

  // ── Footer ──
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
  footerBtnLabel:      { fontSize: 15, fontWeight: '700' },
  footerBtnGreen:      { backgroundColor: GREEN },
  footerBtnGray:       { backgroundColor: '#D1D5DB' },
  footerBtnTextWhite:  { color: '#fff' },
  footerBtnTextGray:   { color: '#6B7280' },
});