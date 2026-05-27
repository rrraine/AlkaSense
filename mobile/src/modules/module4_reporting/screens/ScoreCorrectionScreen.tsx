import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useAuthContext } from '../../../core/AuthContext';
import { submitCorrection } from '../services/ScoreCorrectionService';
import type { ASVScore } from '../../../shared/types/scoring.types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const GREEN = '#008236';
const GREEN_DARK = '#006B2C';

const ASV_RANGE = [1, 2, 3, 4, 5, 6, 7];

function getGTClassification(asv: number): string {
  if (asv <= 2) return 'High GT (>74°C)';
  if (asv <= 5) return 'Intermediate GT (70–74°C)';
  return 'Low GT (<70°C)';
}


// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ASVSelector({
  label,
  selected,
  onSelect,
  locked = false,
}: {
  label: string;
  selected: number;
  onSelect?: (val: number) => void;
  locked?: boolean;
}) {
  const gtClass = getGTClassification(selected);

  return (
    <View style={styles.selectorCard}>
      <Text style={styles.selectorLabel}>{label}</Text>

      <View style={styles.asvRow}>
        {ASV_RANGE.map((val) => {
          const isSelected = val === selected;
          return (
            <TouchableOpacity
              key={val}
              style={[
                styles.asvBtn,
                isSelected && styles.asvBtnSelected,
              ]}
              onPress={() => !locked && onSelect?.(val)}
              activeOpacity={locked ? 1 : 0.7}
              disabled={locked}
            >
              <Text
                style={[
                  styles.asvBtnText,
                  isSelected && styles.asvBtnTextSelected,
                ]}
              >
                {val}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.gtBadge}>
        <Text style={styles.gtSelected}>Selected: ASV {selected}</Text>
        <Text style={styles.gtClass}>{gtClass}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modals
// ─────────────────────────────────────────────────────────────────────────────

function AccessDeniedModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.deniedIconWrapper}>
            <Text style={styles.deniedIcon}>!</Text>
          </View>

          <Text style={styles.modalTitle}>Access denied</Text>

          <Text style={styles.modalBody}>
            Score corrections require certified evaluator status. Contact a PhilRice administrator to
            request access.
          </Text>

          <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmCorrectionModal({
  visible,
  sampleId,
  variety,
  originalASV,
  finalASV,
  remark,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  sampleId: string;
  variety: string;
  originalASV: number;
  finalASV: number;
  remark: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Confirm Correction?</Text>

          <Text style={styles.modalBody}>
            You are changing the score for {sampleId} · {variety} with the following remarks.
            Proceed with caution.
          </Text>

          <Text style={styles.asvChangeLabel}>
            ASV {originalASV} → ASV {finalASV}
          </Text>

          <View style={styles.remarkPreview}>
            <Text style={styles.remarkPreviewText}>{remark}</Text>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} activeOpacity={0.8}>
            <Text style={styles.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ScoreCorrectionScreen({ navigation, route }: any) {
  const {
    sampleId        = 'S003',
    variety         = 'NSIC Rc 222',
    grainCount      = '10 grains',
    session         = 'Spring Harvest 2026',
    sessionId       = '',
    confirmedScoreId = '',
    confirmedBy     = 'Dr. M. Santos',
    confirmedDate   = '5/16/2026, 2:05 PM',
    originalASV     = 4,
    imageUri,
  } = route?.params ?? {};

  const { user, role } = useAuthContext();
  const isCertifiedEvaluator = role === 'certified_evaluator' || role === 'admin';

  const [finalASV, setFinalASV]   = useState<number>(originalASV);
  const [remark, setRemark]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const hasChange    = finalASV !== originalASV;
  const remarkFilled = remark.trim().length > 0;
  const canSubmit    = hasChange && remarkFilled && !submitting;

  function handleSubmitPress() {
    if (!isCertifiedEvaluator) {
      setShowAccessDenied(true);
      return;
    }
    setShowConfirmModal(true);
  }

  async function handleConfirm() {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      await submitCorrection(
        confirmedScoreId,
        sessionId,
        sampleId,
        originalASV as ASVScore,
        finalASV as ASVScore,
        remark.trim(),
        user?.uid ?? ''
      );
      navigation.goBack();
    } catch (e: any) {
      console.error('[ScoreCorrection] submit failed:', e?.message ?? e);
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Score Correction</Text>
          <Text style={styles.headerSubtitle}>Certified Evaluators Only</Text>
        </View>
      </View>

      {/* ── SAMPLE META BANNER ───────────────────────────────────────────────── */}
      <View style={styles.metaBanner}>
        <View style={styles.metaBannerLeft}>
          <Text style={styles.metaBannerLine}>
            {sampleId} · {variety} · {grainCount}
          </Text>
          <Text style={styles.metaBannerSub}>Session: {session}</Text>
        </View>

        {/* Grain image thumbnail */}
        <View style={styles.thumbWrapper}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.thumb} resizeMode="cover" />
          ) : (
            // Placeholder rice grain icon when no image is passed
            <View style={styles.thumbPlaceholder}>
              <Text style={styles.thumbPlaceholderIcon}>🌾</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── SCROLL BODY ──────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Original ASV */}
        <View>
          <Text style={styles.sectionHeading}>Original ASV Score</Text>
          <Text style={styles.confirmedBy}>
            Confirmed by {confirmedBy}{'\n'}{confirmedDate}
          </Text>
          <ASVSelector
            label=""
            selected={originalASV}
            locked
          />
        </View>

        {/* Final ASV */}
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionHeading}>Final ASV Score</Text>
          <ASVSelector
            label=""
            selected={finalASV}
            onSelect={setFinalASV}
          />
        </View>

        {/* Correction Remark */}
        <View style={styles.remarkCard}>
          <View style={styles.remarkHeaderRow}>
            <Text style={styles.remarkWarningIcon}>⚠</Text>
            <Text style={styles.remarkTitle}>Correction Remark</Text>
          </View>

          {hasChange ? (
            <Text style={styles.remarkHint}>
              Your corrected score ({finalASV}) differs from the original confirmed score (
              {originalASV}). Please explain the reason for this correction.
            </Text>
          ) : (
            <Text style={styles.remarkHint}>
              Select a different ASV score above to enable a correction remark.
            </Text>
          )}

          <TextInput
            style={[styles.remarkInput, !hasChange && styles.remarkInputDisabled]}
            placeholder="Describe why the original confirmed score needs to be corrected."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={remark}
            onChangeText={setRemark}
            editable={hasChange}
            textAlignVertical="top"
          />
        </View>

        {/* Bottom padding for footer */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmitPress}
          disabled={!canSubmit}
          activeOpacity={canSubmit ? 0.85 : 1}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.submitBtnText}>⊙ Submit Correction</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}
      <AccessDeniedModal
        visible={showAccessDenied}
        onClose={() => setShowAccessDenied(false)}
      />

      <ConfirmCorrectionModal
        visible={showConfirmModal}
        sampleId={sampleId}
        variety={variety}
        originalASV={originalASV}
        finalASV={finalASV}
        remark={remark}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirmModal(false)}
      />
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
    paddingBottom: 14,
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
  },

  headerSubtitle: {
    color: '#D1FAE5',
    fontSize: 13,
    marginTop: 2,
  },

  // ── Meta Banner ─────────────────────────────────────────────────────────────
  metaBanner: {
    backgroundColor: GREEN_DARK,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  metaBannerLeft: {
    flex: 1,
  },

  metaBannerLine: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  metaBannerSub: {
    color: '#A7F3D0',
    fontSize: 12,
    marginTop: 2,
  },

  thumbWrapper: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  thumb: {
    width: 52,
    height: 52,
  },

  thumbPlaceholder: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  thumbPlaceholderIcon: {
    fontSize: 26,
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },

  confirmedBy: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },

  // ── ASV Selector Card ────────────────────────────────────────────────────────
  selectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  selectorLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 12,
  },

  asvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 6,
  },

  asvBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  asvBtnSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  asvBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },

  asvBtnTextSelected: {
    color: '#FFFFFF',
  },

  gtBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },

  gtSelected: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
    marginBottom: 2,
  },

  gtClass: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },

  // ── Correction Remark Card ───────────────────────────────────────────────────
  remarkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 20,
  },

  remarkHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },

  remarkWarningIcon: {
    fontSize: 18,
    color: '#F59E0B',
  },

  remarkTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F59E0B',
  },

  remarkHint: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginBottom: 12,
  },

  remarkInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    minHeight: 110,
    backgroundColor: '#FAFAFA',
  },

  remarkInputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
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

  submitBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },

  submitBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },

  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },

  // ── Modal shared ──────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },

  modalBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },

  modalCancelBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },

  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  // ── Access Denied Modal ──────────────────────────────────────────────────────
  deniedIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  deniedIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
  },

  // ── Confirm Modal ─────────────────────────────────────────────────────────────
  asvChangeLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
  },

  remarkPreview: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    marginBottom: 20,
  },

  remarkPreviewText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
  },

  confirmBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },

  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});