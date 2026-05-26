import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  runValidationPipeline,
  ValidationOutcome,
  ChecklistState,
} from '../services/ImageValidationService';

const GREEN = '#008236';

// ─── UI status type (lowercase, local to this screen) ────────────────────────
type UIStatus = 'accepted' | 'protocol_violation' | 'quality_failure';

function toUIStatus(s: string): UIStatus {
  if (s === 'ACCEPTED') return 'accepted';
  if (s === 'PROTOCOL_VIOLATION') return 'protocol_violation';
  return 'quality_failure';
}

type PipelineStatus = 'pass' | 'fail' | 'skipped';

// ─── Corrective guidance derived from actual rejection reason ─────────────────
function getCorrectiveGuidance(outcome: ValidationOutcome): string {
  const reason = (outcome.rejection_reason ?? '').toLowerCase();

  if (outcome.status === 'PROTOCOL_VIOLATION') {
    if (reason.includes('illumination')) {
      return 'Ensure UV or blacklight illumination is active and positioned correctly over the grain sample before recapturing.';
    }
    if (reason.includes('tray')) {
      return 'Place the grain sample on a white tray background and ensure it is fully visible in the frame before recapturing.';
    }
    if (reason.includes('single layer') || reason.includes('arrangement')) {
      return 'Arrange the grains in a single, even layer without stacking or overlapping, then recapture.';
    }
    if (reason.includes('petri') || reason.includes('frame')) {
      return 'Reposition the device so the entire petri dish is fully within the capture frame before recapturing.';
    }
    return 'Confirm all protocol checklist items before submitting.';
  }

  if (reason.includes('focus') || reason.includes('steady') || reason.includes('auto-focus')) {
    return 'Hold the device steady and wait for auto-focus to lock before capturing. Consider using a stable surface or tripod.';
  }
  if (reason.includes('exposure') || reason.includes('overexposed') || reason.includes('underexposed') || reason.includes('lighting')) {
    return 'Ensure adequate and even lighting. Avoid direct sunlight or deep shadows on the sample. Use diffused or UV illumination.';
  }
  if (reason.includes('resolution') || reason.includes('grain-level') || reason.includes('too low')) {
    return 'Move the device closer to the sample or use a higher camera resolution setting to ensure grain detail is clearly visible.';
  }
  if (reason.includes('file') || reason.includes('corrupt') || reason.includes('accessible') || reason.includes('not a valid captured image')) {
    return 'The image file could not be read or is not a valid photo. Please use the camera to recapture or select a valid image from your gallery.';
  }
  return 'Adjust your capture setup and try again. Ensure proper lighting, focus, and framing.';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBanner({ uiStatus, label, description }: {
  uiStatus: UIStatus;
  label: string;
  description: string;
}) {
  const isAccepted = uiStatus === 'accepted';
  const isProtocol = uiStatus === 'protocol_violation';

  const bannerStyle = isAccepted ? styles.bannerAccepted : isProtocol ? styles.bannerProtocol : styles.bannerQuality;
  const iconBgStyle = isAccepted ? styles.bannerIconAccepted : isProtocol ? styles.bannerIconProtocol : styles.bannerIconQuality;
  const titleStyle  = isAccepted ? styles.bannerTitleAccepted : isProtocol ? styles.bannerTitleProtocol : styles.bannerTitleQuality;
  const descStyle   = isAccepted ? styles.bannerDescAccepted : isProtocol ? styles.bannerDescProtocol : styles.bannerDescQuality;
  const icon = isAccepted ? '✓' : isProtocol ? '⚠' : '✕';

  return (
    <View style={[styles.bannerBase, bannerStyle]}>
      <View style={[styles.bannerIconContainer, iconBgStyle]}>
        <Text style={styles.bannerIconText}>{icon}</Text>
      </View>
      <View style={styles.bannerTextBlock}>
        <Text style={[styles.bannerTitle, titleStyle]}>{label}</Text>
        <Text style={[styles.bannerDesc, descStyle]}>{description}</Text>
      </View>
    </View>
  );
}

function PipelineIcon({ pipelineStatus }: { pipelineStatus: PipelineStatus }) {
  if (pipelineStatus === 'pass') {
    return <View style={styles.pipelineIconPass}><Text style={styles.pipelineIconText}>✓</Text></View>;
  }
  if (pipelineStatus === 'fail') {
    return <View style={styles.pipelineIconFail}><Text style={styles.pipelineIconText}>✕</Text></View>;
  }
  return <View style={styles.pipelineIconSkipped}><Text style={styles.pipelineIconTextSkipped}>–</Text></View>;
}

function ValidationPipeline({ layer1, layer2, layer3 }: { layer1: PipelineStatus; layer2: PipelineStatus; layer3: PipelineStatus }) {
  return (
    <View style={styles.pipelineCard}>
      <Text style={styles.pipelineTitle}>Validation Pipeline</Text>
      <View style={styles.pipelineRow}>
        <PipelineIcon pipelineStatus={layer1} />
        <View style={styles.pipelineTextBlock}>
          <Text style={styles.pipelineLayerName}>Layer 1: Protocol Compliance</Text>
          <Text style={styles.pipelineLayerDesc}>Physical conditions checklist validation</Text>
        </View>
      </View>
      <View style={styles.pipelineRow}>
        <PipelineIcon pipelineStatus={layer2} />
        <View style={styles.pipelineTextBlock}>
          <Text style={styles.pipelineLayerName}>Layer 2: Technical Quality</Text>
          <Text style={styles.pipelineLayerDesc}>Focus, exposure, and grain visibility analysis</Text>
        </View>
      </View>
      <View style={[styles.pipelineRow, { marginBottom: 0 }]}>
        <PipelineIcon pipelineStatus={layer3} />
        <View style={styles.pipelineTextBlock}>
          <Text style={styles.pipelineLayerName}>Layer 3: Content Plausibility</Text>
          <Text style={styles.pipelineLayerDesc}>Image format and content validity check</Text>
        </View>
      </View>
    </View>
  );
}

function RejectionDetails({ validationLayer, failedCondition, isQuality }: {
  validationLayer: string;
  failedCondition: string;
  isQuality: boolean;
}) {
  const layerTagStyle     = isQuality ? styles.layerTagQuality     : styles.layerTagProtocol;
  const layerTagTextStyle = isQuality ? styles.layerTagTextQuality  : styles.layerTagTextProtocol;

  return (
    <View style={styles.rejectionCard}>
      <Text style={styles.rejectionTitle}>Rejection Details</Text>
      <View style={styles.rejectionField}>
        <Text style={styles.rejectionFieldLabel}>Validation Layer</Text>
        <View style={[styles.layerTag, layerTagStyle]}>
          <Text style={[styles.layerTagText, layerTagTextStyle]}>{validationLayer}</Text>
        </View>
      </View>
      <View style={styles.fieldDivider} />
      <View style={styles.rejectionField}>
        <Text style={styles.rejectionFieldLabel}>Failed Condition</Text>
        <Text style={styles.rejectionFieldValue}>{failedCondition}</Text>
      </View>
    </View>
  );
}

function CorrectiveGuidance({ message }: { message: string }) {
  return (
    <View style={styles.correctiveCard}>
      <View style={styles.correctiveHeader}>
        <Text style={styles.correctiveIcon}>ℹ</Text>
        <Text style={styles.correctiveTitle}>Corrective Guidance</Text>
      </View>
      <Text style={styles.correctiveText}>{message}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ValidationResultScreen({ navigation, route }: any) {
  const {
    imageId,
    imageUri,
    sampleId,
    checklistState,
    evaluatorId,
  } = route.params as {
    imageId: string;
    imageUri: string;
    sampleId: string;
    checklistState: ChecklistState;
    evaluatorId: string;
  };

  const [outcome, setOutcome] = useState<ValidationOutcome | null>(null);
  const [validating, setValidating] = useState(true);
  const [validationError, setValidationError] = useState(false);

  useEffect(() => {
    console.log('[ValidationResult] params — imageId:', imageId, 'imageUri:', imageUri, 'sampleId:', sampleId, 'evaluatorId:', evaluatorId);
    console.log('[ValidationResult] checklistState:', JSON.stringify(checklistState));
    runValidationPipeline(imageId, imageUri, checklistState, sampleId, evaluatorId)
      .then((outcome) => {
        console.log('[ValidationResult] outcome:', JSON.stringify(outcome));
        setOutcome(outcome);
      })
      .catch((e) => {
        console.log('[ValidationResult] pipeline error:', e?.message ?? e);
        setValidationError(true);
      })
      .finally(() => setValidating(false));
  }, []);

  function handleProceed() {
    navigation.navigate('ExpertObservation', { imageId, imageUri, sampleId });
  }

  function handleRecapture() {
    navigation.navigate('ImageCapture', { sampleId });
  }

  // Loading state while pipeline runs
  if (validating) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Validation Result</Text>
          </View>
          <Text style={styles.headerSubtitle}>Analyzing image…</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>Running validation pipeline…</Text>
          <Text style={styles.loadingSubtext}>Checking protocol compliance and image quality</Text>
        </View>
      </View>
    );
  }

  // Error state (pipeline threw)
  if (validationError || !outcome) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Validation Result</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Validation could not be completed.</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={handleRecapture}>
            <Text style={styles.errorBtnText}>Recapture Image</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const uiStatus   = toUIStatus(outcome.status);
  const isAccepted = uiStatus === 'accepted';
  const isQuality  = uiStatus === 'quality_failure';
  const isContent  = outcome.rejection_layer === 'Content Plausibility';

  const pipelineLayer1: PipelineStatus = isAccepted || isQuality || isContent ? 'pass' : 'fail';
  const pipelineLayer2: PipelineStatus = isAccepted || isContent ? 'pass' : isQuality ? 'fail' : 'skipped';
  const pipelineLayer3: PipelineStatus = isAccepted ? 'pass' : isContent ? 'fail' : 'skipped';

  const bannerLabel = isAccepted ? 'ACCEPTED' : isQuality ? 'Quality Failure' : 'Protocol Violation';
  const bannerDesc = isAccepted
    ? 'The submitted image has passed protocol compliance, technical quality, and content plausibility validation.'
    : isContent
    ? 'The image submission did not pass content plausibility validation.'
    : isQuality
    ? 'The image submission failed technical quality validation.'
    : 'The image submission failed protocol compliance validation.';

  const elapsedMs = outcome.elapsed_ms ?? 0;

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Validation Result</Text>
        </View>
        <Text style={styles.headerSubtitle}>Sample {sampleId}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        {/* STATUS BANNER */}
        <View style={styles.section}>
          <StatusBanner uiStatus={uiStatus} label={bannerLabel} description={bannerDesc} />
        </View>

        {/* TIMING */}
        <View style={styles.timingRow}>
          <View style={styles.timingLeft}>
            <Text style={styles.timingClockIcon}>⏱</Text>
            <Text style={styles.timingLabel}>Validation completed in:</Text>
          </View>
          <Text style={styles.timingValue}>{elapsedMs}ms</Text>
        </View>

        {/* REJECTION DETAILS — error states only */}
        {!isAccepted && outcome.rejection_layer && outcome.rejection_reason && (
          <View style={styles.section}>
            <RejectionDetails
              validationLayer={outcome.rejection_layer}
              failedCondition={outcome.rejection_reason}
              isQuality={isQuality}
            />
          </View>
        )}

        {/* CORRECTIVE GUIDANCE — error states only */}
        {!isAccepted && (
          <View style={styles.section}>
            <CorrectiveGuidance message={getCorrectiveGuidance(outcome)} />
          </View>
        )}

        {/* VALIDATION PIPELINE */}
        <View style={styles.section}>
          <ValidationPipeline layer1={pipelineLayer1} layer2={pipelineLayer2} layer3={pipelineLayer3} />
        </View>

        {/* SUBMITTED IMAGE */}
        <View style={styles.imageCard}>
          <Text style={styles.imageCardTitle}>Submitted Image</Text>
          <Image source={{ uri: imageUri }} style={styles.submittedImage} />
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        {isAccepted ? (
          <>
            <TouchableOpacity style={styles.proceedBtn} onPress={handleProceed}>
              <Text style={styles.proceedText}>Proceed to Evaluation  →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.recaptureBtn} onPress={handleRecapture}>
              <View style={styles.recaptureBtnInner}>
                <Image
                  source={require('../../../../assets/blackCameraIcon.png')}
                  style={styles.recaptureIcon}
                />
                <Text style={styles.recaptureText}>Recapture Image</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.proceedBtn} onPress={handleRecapture}>
            <View style={styles.recaptureBtnInner}>
              <Image
                source={require('../../../../assets/blackCameraIcon.png')}
                style={[styles.recaptureIcon, { tintColor: '#FFFFFF' }]}
              />
              <Text style={styles.proceedText}>Recapture Image</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    backgroundColor: GREEN,
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  backArrow: { color: '#FFFFFF', fontSize: 24 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  headerSubtitle: { color: '#E5E7EB', fontSize: 15, marginTop: 2 },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  loadingText:    { fontSize: 16, fontWeight: '600', color: '#374151' },
  loadingSubtext: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  errorText:      { fontSize: 15, color: '#DC2626', textAlign: 'center' },
  errorBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  errorBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  section: { paddingHorizontal: 16, marginTop: 16 },

  bannerBase: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderWidth: 1.5,
  },
  bannerAccepted:  { backgroundColor: '#F0FFF4', borderColor: '#86EFAC' },
  bannerProtocol:  { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' },
  bannerQuality:   { backgroundColor: '#FFF5F5', borderColor: '#FCA5A5' },
  bannerIconContainer: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerIconAccepted: { backgroundColor: GREEN },
  bannerIconProtocol: { backgroundColor: '#F97316' },
  bannerIconQuality:  { backgroundColor: '#EF4444' },
  bannerIconText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  bannerTextBlock: { flex: 1 },
  bannerTitle:     { fontSize: 17, fontWeight: '800', marginBottom: 5 },
  bannerTitleAccepted: { color: '#166534' },
  bannerTitleProtocol: { color: '#C2410C' },
  bannerTitleQuality:  { color: '#B91C1C' },
  bannerDesc:      { fontSize: 14, lineHeight: 20 },
  bannerDescAccepted: { color: '#15803D' },
  bannerDescProtocol: { color: '#9A3412' },
  bannerDescQuality:  { color: '#991B1B' },

  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timingLeft:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timingClockIcon:{ fontSize: 15, color: '#6B7280' },
  timingLabel:    { color: '#6B7280', fontSize: 14 },
  timingValue:    { color: '#111827', fontSize: 14, fontWeight: '700' },

  rejectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rejectionTitle:      { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
  rejectionField:      { paddingVertical: 10 },
  rejectionFieldLabel: {
    fontSize: 12, color: '#9CA3AF', fontWeight: '500',
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  rejectionFieldValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
  fieldDivider:        { height: 1, backgroundColor: '#F3F4F6' },

  layerTag:             { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 },
  layerTagProtocol:     { backgroundColor: '#FFF7ED' },
  layerTagQuality:      { backgroundColor: '#FFF5F5' },
  layerTagText:         { fontSize: 13, fontWeight: '600' },
  layerTagTextProtocol: { color: '#C2410C' },
  layerTagTextQuality:  { color: '#B91C1C' },

  correctiveCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  correctiveHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  correctiveIcon:   { fontSize: 16, color: '#2563EB', fontWeight: '700' },
  correctiveTitle:  { color: '#2563EB', fontWeight: '700', fontSize: 14 },
  correctiveText:   { color: '#1D4ED8', fontSize: 14, lineHeight: 21 },

  pipelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pipelineTitle:    { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 16 },
  pipelineRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  pipelineIconPass: { width: 28, height: 28, borderRadius: 14, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  pipelineIconFail: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  pipelineIconSkipped: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  pipelineIconText:        { color: '#FFFFFF', fontSize: 13, fontWeight: '800', lineHeight: 15 },
  pipelineIconTextSkipped: { color: '#9CA3AF', fontSize: 16, fontWeight: '700', lineHeight: 18 },
  pipelineTextBlock: { flex: 1 },
  pipelineLayerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  pipelineLayerDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  imageCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imageCardTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 14 },
  submittedImage: {
    width: '100%', height: 280, borderRadius: 12,
    resizeMode: 'cover', backgroundColor: '#F3F4F6',
  },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: '#FFFFFF',
    gap: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  proceedBtn: {
    backgroundColor: GREEN, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
  },
  proceedText:     { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  recaptureBtn: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  recaptureBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recaptureIcon:     { width: 18, height: 18, resizeMode: 'contain' },
  recaptureText:     { color: '#111827', fontWeight: '600', fontSize: 16 },
});
