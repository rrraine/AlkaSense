import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert,
} from 'react-native';

type ValidationStatus = 'accepted' | 'protocol_violation' | 'quality_failure';
type PipelineStatus = 'pass' | 'fail' | 'skipped';

const GREEN = '#008236';

interface BaseConfig {
  status: ValidationStatus;
  label: string;
  description: string;
  completedIn: string;
  pipeline: { layer1: PipelineStatus; layer2: PipelineStatus };
}
interface ErrorConfig extends BaseConfig {
  rejection: { validationLayer: string; failedCondition: string; reason: string };
  corrective: string;
}
type StatusConfig = BaseConfig | ErrorConfig;

const FALLBACK_CONFIG: Record<ValidationStatus, StatusConfig> = {
  accepted: {
    status: 'accepted', label: 'ACCEPTED',
    description: 'The submitted image has passed both protocol compliance and technical quality validation.',
    completedIn: '1247ms', pipeline: { layer1: 'pass', layer2: 'pass' },
  },
  protocol_violation: {
    status: 'protocol_violation', label: 'Protocol Violation',
    description: 'The image submission failed protocol compliance validation.',
    completedIn: '892ms', pipeline: { layer1: 'fail', layer2: 'skipped' },
    rejection: { validationLayer: 'Protocol Compliance', failedCondition: 'Even lighting across sample', reason: 'Inadequate lighting condition not confirmed' },
    corrective: 'Ensure the sample is evenly lit without shadows. Use diffused lighting or adjust the position to eliminate dark spots.',
  },
  quality_failure: {
    status: 'quality_failure', label: 'Quality Failure',
    description: 'The image submission failed technical quality validation.',
    completedIn: '2134ms', pipeline: { layer1: 'pass', layer2: 'fail' },
    rejection: { validationLayer: 'Technical Quality', failedCondition: 'Sharpness and focus', reason: 'Image blur level exceeds acceptable threshold' },
    corrective: 'Hold the device steady and wait for auto-focus to lock before capturing.',
  },
};

function StatusBanner({ status }: { status: ValidationStatus }) {
  const config = FALLBACK_CONFIG[status];
  const isAccepted = status === 'accepted';
  const isProtocol = status === 'protocol_violation';
  const bannerStyle = isAccepted ? styles.bannerAccepted : isProtocol ? styles.bannerProtocol : styles.bannerQuality;
  const iconBgStyle = isAccepted ? styles.bannerIconAccepted : isProtocol ? styles.bannerIconProtocol : styles.bannerIconQuality;
  const titleStyle = isAccepted ? styles.bannerTitleAccepted : isProtocol ? styles.bannerTitleProtocol : styles.bannerTitleQuality;
  const descStyle = isAccepted ? styles.bannerDescAccepted : isProtocol ? styles.bannerDescProtocol : styles.bannerDescQuality;
  const icon = isAccepted ? '✓' : isProtocol ? '⚠' : '✕';
  return (
    <View style={[styles.bannerBase, bannerStyle]}>
      <View style={[styles.bannerIconContainer, iconBgStyle]}>
        <Text style={styles.bannerIconText}>{icon}</Text>
      </View>
      <View style={styles.bannerTextBlock}>
        <Text style={[styles.bannerTitle, titleStyle]}>{config.label}</Text>
        <Text style={[styles.bannerDesc, descStyle]}>{config.description}</Text>
      </View>
    </View>
  );
}

function PipelineIcon({ pipelineStatus }: { pipelineStatus: PipelineStatus }) {
  if (pipelineStatus === 'pass') return <View style={styles.pipelineIconPass}><Text style={styles.pipelineIconText}>✓</Text></View>;
  if (pipelineStatus === 'fail') return <View style={styles.pipelineIconFail}><Text style={styles.pipelineIconText}>✕</Text></View>;
  return <View style={styles.pipelineIconSkipped}><Text style={styles.pipelineIconTextSkipped}>–</Text></View>;
}

export default function ValidationResultScreen({ navigation, route }: any) {
  const {
    result,
    imageUri,
    sampleId,
    sample_identifier,
    variety,
    grainCount,
    session,
    sessionId,
  } = route.params;

  const status: ValidationStatus = result?.status ?? 'accepted';
  const isAccepted = status === 'accepted';
  const isQuality  = status === 'quality_failure';

  // Merge live result data on top of fallback so styles/labels always resolve
  const config = {
    ...FALLBACK_CONFIG[status],
    completedIn: result?.completedIn ?? FALLBACK_CONFIG[status].completedIn,
    pipeline:    result?.pipeline    ?? FALLBACK_CONFIG[status].pipeline,
    ...(result?.rejection && {
      rejection:  result.rejection,
      corrective: result.corrective,
    }),
  };
  const errorConfig = !isAccepted ? (config as ErrorConfig) : null;

  const displaySampleLabel = sample_identifier ?? 'Unknown sample';

  function handleProceed() {
    navigation.navigate('ExpertObservation', {
      imageUri, sampleId, sample_identifier, variety, grainCount, session, sessionId,
    });
  }

  function handleResubmit() {
    navigation.navigate('ImageCapture', {
      sampleId, sample_identifier, variety, grainCount, session, sessionId,
    });
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Validation Result</Text>
        </View>
        <Text style={styles.headerSubtitle}>Sample {displaySampleLabel}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={styles.section}><StatusBanner status={status} /></View>

        <View style={styles.timingRow}>
          <View style={styles.timingLeft}>
            <Text style={styles.timingClockIcon}>⏱</Text>
            <Text style={styles.timingLabel}>Validation completed in:</Text>
          </View>
          <Text style={styles.timingValue}>{config.completedIn}</Text>
        </View>

        {errorConfig && 'rejection' in errorConfig && (
          <View style={styles.section}>
            <View style={styles.rejectionCard}>
              <Text style={styles.rejectionTitle}>Rejection Details</Text>
              <View style={styles.rejectionField}>
                <Text style={styles.rejectionFieldLabel}>Validation Layer</Text>
                <View style={[styles.layerTag, isQuality ? styles.layerTagQuality : styles.layerTagProtocol]}>
                  <Text style={[styles.layerTagText, isQuality ? styles.layerTagTextQuality : styles.layerTagTextProtocol]}>
                    {errorConfig.rejection.validationLayer}
                  </Text>
                </View>
              </View>
              <View style={styles.fieldDivider} />
              <View style={styles.rejectionField}>
                <Text style={styles.rejectionFieldLabel}>Failed Condition</Text>
                <Text style={styles.rejectionFieldValue}>{errorConfig.rejection.failedCondition}</Text>
              </View>
              <View style={styles.fieldDivider} />
              <View style={styles.rejectionField}>
                <Text style={styles.rejectionFieldLabel}>Reason</Text>
                <Text style={styles.rejectionFieldValue}>{errorConfig.rejection.reason}</Text>
              </View>
            </View>
          </View>
        )}

        {errorConfig && 'corrective' in errorConfig && (
          <View style={styles.section}>
            <View style={styles.correctiveCard}>
              <View style={styles.correctiveHeader}>
                <Text style={styles.correctiveIcon}>ℹ</Text>
                <Text style={styles.correctiveTitle}>Corrective Guidance</Text>
              </View>
              <Text style={styles.correctiveText}>{errorConfig.corrective}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.pipelineCard}>
            <Text style={styles.pipelineTitle}>Validation Pipeline</Text>
            <View style={styles.pipelineRow}>
              <PipelineIcon pipelineStatus={config.pipeline.layer1} />
              <View style={styles.pipelineTextBlock}>
                <Text style={styles.pipelineLayerName}>Layer 1: Protocol Compliance</Text>
                <Text style={styles.pipelineLayerDesc}>Physical conditions checklist validation</Text>
              </View>
            </View>
            <View style={[styles.pipelineRow, { marginBottom: 0 }]}>
              <PipelineIcon pipelineStatus={config.pipeline.layer2} />
              <View style={styles.pipelineTextBlock}>
                <Text style={styles.pipelineLayerName}>Layer 2: Technical Quality</Text>
                <Text style={styles.pipelineLayerDesc}>Blur, exposure, and grain visibility analysis</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.imageCard}>
          <Text style={styles.imageCardTitle}>Submitted Image</Text>
          <Image source={{ uri: imageUri }} style={styles.submittedImage} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isAccepted ? (
          <TouchableOpacity style={styles.proceedBtn} onPress={handleProceed}>
            <Text style={styles.proceedText}>Proceed to Evaluation  →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.proceedBtn} onPress={handleResubmit}>
            <Text style={styles.proceedText}>Resubmit Image</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: GREEN, paddingTop: 54, paddingBottom: 20, paddingHorizontal: 20 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  backArrow: { color: '#FFFFFF', fontSize: 24 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  headerSubtitle: { color: '#E5E7EB', fontSize: 15, marginTop: 2 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  bannerBase: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderWidth: 1.5 },
  bannerAccepted: { backgroundColor: '#F0FFF4', borderColor: '#86EFAC' },
  bannerProtocol: { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' },
  bannerQuality: { backgroundColor: '#FFF5F5', borderColor: '#FCA5A5' },
  bannerIconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  bannerIconAccepted: { backgroundColor: GREEN },
  bannerIconProtocol: { backgroundColor: '#F97316' },
  bannerIconQuality: { backgroundColor: '#EF4444' },
  bannerIconText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  bannerTextBlock: { flex: 1 },
  bannerTitle: { fontSize: 17, fontWeight: '800', marginBottom: 5 },
  bannerTitleAccepted: { color: '#166534' },
  bannerTitleProtocol: { color: '#C2410C' },
  bannerTitleQuality: { color: '#B91C1C' },
  bannerDesc: { fontSize: 14, lineHeight: 20 },
  bannerDescAccepted: { color: '#15803D' },
  bannerDescProtocol: { color: '#9A3412' },
  bannerDescQuality: { color: '#991B1B' },
  timingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  timingLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timingClockIcon: { fontSize: 15, color: '#6B7280' },
  timingLabel: { color: '#6B7280', fontSize: 14 },
  timingValue: { color: '#111827', fontSize: 14, fontWeight: '700' },
  rejectionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  rejectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
  rejectionField: { paddingVertical: 10 },
  rejectionFieldLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  rejectionFieldValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
  fieldDivider: { height: 1, backgroundColor: '#F3F4F6' },
  layerTag: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 },
  layerTagProtocol: { backgroundColor: '#FFF7ED' },
  layerTagQuality: { backgroundColor: '#FFF5F5' },
  layerTagText: { fontSize: 13, fontWeight: '600' },
  layerTagTextProtocol: { color: '#C2410C' },
  layerTagTextQuality: { color: '#B91C1C' },
  correctiveCard: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  correctiveHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  correctiveIcon: { fontSize: 16, color: '#2563EB', fontWeight: '700' },
  correctiveTitle: { color: '#2563EB', fontWeight: '700', fontSize: 14 },
  correctiveText: { color: '#1D4ED8', fontSize: 14, lineHeight: 21 },
  pipelineCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  pipelineTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 16 },
  pipelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  pipelineIconPass: { width: 28, height: 28, borderRadius: 14, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  pipelineIconFail: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  pipelineIconSkipped: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  pipelineIconText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', lineHeight: 15 },
  pipelineIconTextSkipped: { color: '#9CA3AF', fontSize: 16, fontWeight: '700', lineHeight: 18 },
  pipelineTextBlock: { flex: 1 },
  pipelineLayerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  pipelineLayerDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  imageCard: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  imageCardTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 14 },
  submittedImage: { width: '100%', height: 280, borderRadius: 12, resizeMode: 'cover', backgroundColor: '#F3F4F6' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  proceedBtn: { backgroundColor: GREEN, borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  proceedText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  recaptureBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  recaptureText: { color: '#111827', fontWeight: '600', fontSize: 16 },
});