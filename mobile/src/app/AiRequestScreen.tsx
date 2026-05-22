import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Pressable,
  StatusBar,
} from 'react-native';

const GREEN = '#008236';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Map the raw answers object to display-friendly label/value rows */
function buildObservationRows(answers: Record<string, any>) {
  const anomalyDisplay =
    Array.isArray(answers.anomalyFlags) && answers.anomalyFlags.length > 0
      ? answers.anomalyFlags.join(', ')
      : 'No Anomaly';

  return [
    {
      label: 'Spreading Pattern Texture',
      value: answers.spreadingPattern ?? '—',
    },
    {
      label: 'Grain Translucency',
      value: answers.grainTranslucency ?? '—',
    },
    {
      label: 'Within-dish Score Uniformity',
      value: answers.scoreUniformity ?? '—',
    },
    {
      label: 'Anomaly Flags',
      value: anomalyDisplay,
    },
    {
      label: 'KOH Solution Appearance',
      value: answers.kohSolution ?? '—',
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Tappable image thumbnail shown inside the header info banner */
function HeaderThumbnail({
  imageUri,
  onPress,
}: {
  imageUri?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.thumbnailContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.thumbnailPlaceholder} />
      )}
      <View style={styles.thumbnailOverlay}>
        <Text style={styles.thumbnailOverlayIcon}>⛶</Text>
      </View>
    </TouchableOpacity>
  );
}

/** Full-screen image modal triggered by tapping the thumbnail */
function ImagePreviewModal({
  visible,
  imageUri,
  sampleId,
  onClose,
}: {
  visible: boolean;
  imageUri?: string;
  sampleId: string;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Submitted Image</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>Sample {sampleId}</Text>

          <Image
            source={imageUri ? { uri: imageUri } : undefined}
            style={styles.modalImage}
            resizeMode="contain"
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Green circle-check icon + title row at the top of the summary card */
function SummaryCardTitle() {
  return (
    <View style={styles.summaryTitleRow}>
      <View style={styles.summaryCheckCircle}>
        <Text style={styles.summaryCheckIcon}>✓</Text>
      </View>
      <Text style={styles.summaryTitle}>Observation Summary</Text>
    </View>
  );
}

/** A single labeled observation row inside the summary card */
function ObservationRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.obsRow, !isLast && styles.obsRowBorder]}>
      <Text style={styles.obsLabel}>{label}</Text>
      <Text style={styles.obsValue}>{value}</Text>
    </View>
  );
}

/** Blue info card explaining what the AI draft will do */
function AiDraftInfoCard() {
  return (
    <View style={styles.aiInfoCard}>
      <View style={styles.aiInfoRow}>
        {/* sparkle icon — using a unicode star cluster as fallback */}
        <Text style={styles.aiInfoIcon}>✦</Text>
        <Text style={styles.aiInfoTitle}>AI Draft Assistance</Text>
      </View>
      <Text style={styles.aiInfoBody}>
        The AI will analyze the validated grain image and compare it with your
        observations to generate a draft ASV score suggestion.
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function AiRequestScreen({ navigation, route }: any) {
  const {
    imageUri,
    sampleId  = 'S003',
    variety   = 'NSIC Rc 222',
    grainCount = '10',
    session   = 'Spring Harvest 2026',
    answers   = {},
  } = route?.params ?? {};

  const [imageModalVisible, setImageModalVisible] = useState(false);

  const observationRows = buildObservationRows(answers);

  function handleRequestDraft() {
    navigation.navigate('AiDraftLoading', {
      imageUri,
      sampleId,
      variety,
      grainCount,
      session,
      answers,
    });
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Scoring</Text>
        </View>

        <Text style={styles.headerSubtitle}>Sample {sampleId}</Text>

        {/* Info banner with thumbnail */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerText}>
            <Text style={styles.infoBannerLine1}>
              {sampleId} • {variety} • {grainCount} grains
            </Text>
            <Text style={styles.infoBannerLine2}>Session: {session}</Text>
          </View>

          <HeaderThumbnail
            imageUri={imageUri}
            onPress={() => setImageModalVisible(true)}
          />
        </View>
      </View>

      {/* ── SCROLL BODY ─────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Observation summary card */}
        <View style={styles.summaryCard}>
          <SummaryCardTitle />

          <View style={styles.obsTable}>
            {observationRows.map((row, i) => (
              <ObservationRow
                key={row.label}
                label={row.label}
                value={row.value}
                isLast={i === observationRows.length - 1}
              />
            ))}
          </View>
        </View>

        {/* AI draft info card */}
        <AiDraftInfoCard />

      </ScrollView>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.requestBtn}
          onPress={handleRequestDraft}
          activeOpacity={0.85}
        >
          <Text style={styles.requestBtnIcon}>✦</Text>
          <Text style={styles.requestBtnText}>Request AI Draft</Text>
        </TouchableOpacity>
      </View>

      {/* ── IMAGE MODAL ─────────────────────────────────────────────────────── */}
      <ImagePreviewModal
        visible={imageModalVisible}
        imageUri={imageUri}
        sampleId={sampleId}
        onClose={() => setImageModalVisible(false)}
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
    paddingBottom: 20,
    paddingHorizontal: 20,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 6,
  },

  backArrow: {
    color: '#FFFFFF',
    fontSize: 24,
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
    marginBottom: 12,
  },

  // ── Info banner ──────────────────────────────────────────────────────────────
  infoBanner: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  infoBannerText: {
    flex: 1,
    marginRight: 12,
  },

  infoBannerLine1: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.9,
  },

  infoBannerLine2: {
    color: '#DCFCE7',
    fontSize: 12,
    marginTop: 3,
    opacity: 0.8,
  },

  // ── Thumbnail ────────────────────────────────────────────────────────────────
  thumbnailContainer: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },

  thumbnail: {
    width: '100%',
    height: '100%',
  },

  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  thumbnailOverlayIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 14,
  },

  // ── Summary card ─────────────────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },

  summaryCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryCheckIcon: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 15,
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  // ── Observation table ────────────────────────────────────────────────────────
  obsTable: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  obsRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },

  obsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  obsLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 3,
  },

  obsValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

  // ── AI info card ─────────────────────────────────────────────────────────────
  aiInfoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 6,
  },

  aiInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  aiInfoIcon: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },

  aiInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
  },

  aiInfoBody: {
    fontSize: 13,
    color: '#2563EB',
    lineHeight: 19,
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

  requestBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  requestBtnIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  requestBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Image modal ───────────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    width: '100%',
    maxWidth: 400,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCloseText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },

  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 14,
  },

  modalImage: {
    width: '100%',
    height: 340,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
});