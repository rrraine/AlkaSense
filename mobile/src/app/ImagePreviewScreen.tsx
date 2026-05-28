import React, { useState, useCallback } from 'react';
import { auth } from '../core/firebase';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';

import ProtocolChecklist, {
  ProtocolState,
  INITIAL_PROTOCOL_STATE,
  allProtocolPassed,
} from '../components/ProtocolChecklist';

import { validateImage, submitValidatedImage } from '../services/ImageService';

const GREEN = '#008236';

export type ValidationStatus =
  | 'Accepted'
  | 'Protocol Violation'
  | 'Quality Failure';

export default function ImagePreviewScreen({ navigation, route }: any) {
  const {
    imageUri,
    sampleId,
    sample_identifier,
    variety,
    grainCount,
    session,
    sessionId,
  } = route.params;

  // ── Protocol checklist state ─────────────────────────────────
  const [protocol, setProtocol] = useState<ProtocolState>(INITIAL_PROTOCOL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasImage = Boolean(imageUri);
  const protocolReady = allProtocolPassed(protocol);
  const canSubmit = hasImage && protocolReady && !isSubmitting;

  const handleProtocolChange = useCallback((updated: ProtocolState) => {
    setProtocol(updated);
  }, []);

  // ── Submit handler ───────────────────────────────────────────
  async function handleSubmit() {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {

      // Layer 1 + Layer 2 validation pipeline
      const result = await validateImage({
        sampleId,
        imageUri,
        uvLight: protocol.uvLight,
        whiteTray: protocol.whiteTray,
        singleLayer: protocol.singleLayer,
        frameAligned: protocol.frameAligned,
      });

      // Map outcome to ValidationStatus for the DB record
      const validationStatus: ValidationStatus =
        result.status === 'accepted'
          ? 'Accepted'
          : result.status === 'protocol_violation'
          ? 'Protocol Violation'
          : 'Quality Failure';

      // Always persist — rejected records are retained for audit,
      // accepted records advance the sample status.
      await submitValidatedImage({
        sampleId,
        sessionId,
        imagePath: imageUri,
        validationStatus,
        validationResult: result,
        protocol: {
          uvLight: protocol.uvLight,
          whiteTray: protocol.whiteTray,
          singleLayer: protocol.singleLayer,
          frameAligned: protocol.frameAligned,
        },
        evaluatorId: auth.currentUser?.uid,
      });

      // Navigate to ValidationResult regardless of outcome —
      // the result screen handles the Resubmit vs Proceed branching.
      navigation.navigate('ValidationResult', {
        result,
        imageUri,
        sampleId,
        sample_identifier,
        variety,
        grainCount,
        session,
        sessionId,
      });

    } catch (err: any) {
      Alert.alert('Submission Error', err?.message ?? 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <View style={styles.root}>

      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Image Preview</Text>
          </View>

          <Text style={styles.headerSubtitle}>Sample {sample_identifier}</Text>

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              {sample_identifier} • {variety} • {grainCount} grains
            </Text>
            <Text style={styles.headerSession}>Session: {session}</Text>
          </View>
        </View>

        {/* IMAGE CARD */}
        <View style={styles.imageCard}>
          <Text style={styles.cardTitle}>Captured Image</Text>
          <Text style={styles.cardSubtitle}>
            Review framing and lighting before submission
          </Text>

          {/* 240×240 fixed crop — matches auto-crop output from capture pipeline */}
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              resizeMode="cover"
              accessibilityLabel="Captured grain sample, cropped to 240 by 240 pixels"
            />
            {/* Green registration corners — visual cue for scientific framing */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          {/* Crop size badge */}
          <View style={styles.cropBadge}>
            <Text style={styles.cropBadgeText}>Auto-cropped · 240 × 240 px</Text>
          </View>
        </View>

        {/* PROTOCOL COMPLIANCE CHECKLIST */}
        <View style={styles.checklistWrapper}>
          <ProtocolChecklist
            state={protocol}
            onChange={handleProtocolChange}
          />
        </View>

      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>

        {/* Gate hint — visible only when image is ready but checklist is incomplete */}
        {hasImage && !protocolReady && (
          <View style={styles.gateHint}>
            <Text style={styles.gateHintText}>
              Complete all protocol conditions to enable submission
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityLabel="Submit image"
          accessibilityState={{ disabled: !canSubmit }}
          accessibilityHint={
            !hasImage
              ? 'No image captured'
              : !protocolReady
              ? 'Complete all protocol checklist items first'
              : 'Submit the captured grain image'
          }
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Image
                source={require('../../assets/cameraIcon2.png')}
                style={[styles.submitIcon, !canSubmit && styles.submitIconDisabled]}
              />
              <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
                Submit Image
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retakeText}>Recapture Image</Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────

const CORNER_SIZE = 14;
const CORNER_THICKNESS = 2;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  // ── Header ──────────────────────────────────────────────────
  header: {
    backgroundColor: GREEN,
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },

  backArrow: {
    color: '#FFFFFF',
    fontSize: 24,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  headerSubtitle: {
    color: '#E5E7EB',
    fontSize: 15,
    marginTop: 2,
  },

  infoContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  infoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },

  headerSession: {
    color: '#DCFCE7',
    fontSize: 13,
    marginTop: 8,
    opacity: 0.8,
  },

  // ── Image card ───────────────────────────────────────────────
  imageCard: {
    backgroundColor: '#ECFDF3',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
  },

  cardTitle: {
    alignSelf: 'flex-start',
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
  },

  cardSubtitle: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 16,
    color: '#15803D',
    fontSize: 13,
  },

  // Fixed 240×240 wrapper — matches auto-crop output exactly
  imageWrapper: {
    width: 240,
    height: 240,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    position: 'relative',
  },

  previewImage: {
    width: 240,
    height: 240,
  },

  // Scientific registration corners
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: GREEN,
  },
  cornerTL: { top: 6, left: 6, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerTR: { top: 6, right: 6, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  cornerBL: { bottom: 6, left: 6, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerBR: { bottom: 6, right: 6, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },

  cropBadge: {
    marginTop: 10,
    backgroundColor: '#D1FAE5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },

  cropBadgeText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Checklist wrapper ────────────────────────────────────────
  // ProtocolChecklist is dark-themed internally; we keep it as-is
  // inside a light-bg margin so it reads as an intentional contrast panel.
  checklistWrapper: {
    marginHorizontal: 20,
    marginTop: 20,
  },

  // ── Footer ──────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 10,
  },

  // Gate hint strip above buttons
  gateHint: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },

  gateHintText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '500',
  },

  submitBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  // Disabled state: greyed out, not hidden — communicates why it's locked
  submitBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },

  submitIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },

  submitIconDisabled: {
    opacity: 0.4,
  },

  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },

  submitTextDisabled: {
    color: '#9CA3AF',
  },

  retakeBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  retakeText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
});
