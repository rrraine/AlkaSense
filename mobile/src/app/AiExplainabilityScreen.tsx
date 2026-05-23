import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  Switch,
} from 'react-native';

const GREEN = '#008236';

// ─────────────────────────────────────────────────────────────────────────────
// Heatmap Legend Component
// ─────────────────────────────────────────────────────────────────────────────

function HeatmapLegend() {
  return (
    <View style={styles.legendCard}>
      <Text style={styles.legendTitle}>
        Attention Heatmap Legend
      </Text>

      <View style={styles.legendList}>

        <View style={styles.legendRow}>
          <View
            style={[
              styles.legendColor,
              { backgroundColor: '#F87171' },
            ]}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.legendLabel}>
              High Attention
            </Text>

            <Text style={styles.legendDescription}>
              Critical regions for classification
            </Text>
          </View>
        </View>

        <View style={styles.legendRow}>
          <View
            style={[
              styles.legendColor,
              { backgroundColor: '#FACC15' },
            ]}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.legendLabel}>
              Moderate Attention
            </Text>

            <Text style={styles.legendDescription}>
              Supporting features
            </Text>
          </View>
        </View>

        <View style={styles.legendRow}>
          <View
            style={[
              styles.legendColor,
              { backgroundColor: '#4ADE80' },
            ]}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.legendLabel}>
              Low Attention
            </Text>

            <Text style={styles.legendDescription}>
              Background regions
            </Text>
          </View>
        </View>

      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function AiExplainabilityScreen({
  navigation,
  route,
}: any) {

  const { imageUri } = route?.params ?? {};

  const [showHeatmap, setShowHeatmap] = useState(true);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ───────────────── HEADER ───────────────── */}
      <View style={styles.header}>

        <View style={styles.headerTopRow}>

          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>
              AI Explainability
            </Text>

            <Text style={styles.headerSubtitle}>
              Visual Analysis
            </Text>
          </View>

        </View>

      </View>

      {/* ───────────────── BODY ───────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ───────────────── INFO CARD ───────────────── */}
        <View style={styles.infoCard}>

          <View style={styles.infoRow}>

            <View style={styles.infoIconCircle}>
              <Text style={styles.infoIcon}>i</Text>
            </View>

            <View style={{ flex: 1 }}>

              <Text style={styles.infoTitle}>
                Heatmap Visualization
              </Text>

              <Text style={styles.infoBody}>
                Highlighted regions show where the AI model
                focused attention when generating the
                classification.
              </Text>

            </View>

          </View>

        </View>

        {/* ───────────────── TOGGLE CARD ───────────────── */}
        <View style={styles.toggleCard}>

          {/* LEFT TITLE */}
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleTitle}>
              Show Heatmap{'\n'}Overlay
            </Text>
          </View>

          {/* CENTER DESCRIPTION */}
          <View style={styles.toggleCenter}>
            <Text style={styles.toggleDescription}>
              Toggle AI attention visualization
            </Text>
          </View>

          {/* RIGHT SWITCH */}
          <Switch
            value={showHeatmap}
            onValueChange={setShowHeatmap}
            trackColor={{
              false: '#D1D5DB',
              true: '#86EFAC',
            }}
            thumbColor={
              showHeatmap ? GREEN : '#FFFFFF'
            }
          />

        </View>

        {/* ───────────────── IMAGE CARD ───────────────── */}
        <View style={styles.imageCard}>

          {/* Overlay ON chip */}
          {showHeatmap && (
            <View style={styles.overlayChip}>

              <Text style={styles.overlayChipIcon}>
                ◉
              </Text>

              <Text style={styles.overlayChipText}>
                Overlay ON
              </Text>

            </View>
          )}

          {/* IMAGE */}
          {imageUri ? (
            <View style={styles.imageWrapper}>

              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="cover"
              />

              {/* HEATMAP OVERLAY */}
              {showHeatmap && (
                <View style={styles.heatmapOverlay}>

                  <View
                    style={[
                      styles.heatBlob,
                      styles.redBlob,
                      {
                        top: '20%',
                        left: '22%',
                      },
                    ]}
                  />

                  <View
                    style={[
                      styles.heatBlob,
                      styles.orangeBlob,
                      {
                        top: '38%',
                        left: '56%',
                      },
                    ]}
                  />

                  <View
                    style={[
                      styles.heatBlob,
                      styles.yellowBlob,
                      {
                        top: '58%',
                        left: '34%',
                      },
                    ]}
                  />

                  <View
                    style={[
                      styles.heatBlob,
                      styles.greenBlob,
                      {
                        top: '70%',
                        left: '68%',
                      },
                    ]}
                  />

                </View>
              )}

            </View>
          ) : (
            <View style={styles.placeholderContainer}>

              <Text style={styles.placeholderEmoji}>
                🌾
              </Text>

              <Text style={styles.placeholderText}>
                Grain Sample Image
              </Text>

            </View>
          )}

        </View>

        {/* ───────────────── LEGEND ───────────────── */}
        {showHeatmap && <HeatmapLegend />}

        {/* ───────────────── SUMMARY ───────────────── */}
        <View style={styles.summaryCard}>

          <Text style={styles.summaryTitle}>
            AI Analysis Summary
          </Text>

          <View style={styles.summaryList}>

            <View style={styles.summaryRow}>

              <Text style={styles.bullet}>•</Text>

              <Text style={styles.summaryText}>
                <Text style={styles.summaryBold}>
                  Edge spreading pattern:
                </Text>{' '}
                Moderate diffusion detected along grain
                boundaries, indicating intermediate
                gelatinization.
              </Text>

            </View>

            <View style={styles.summaryRow}>

              <Text style={styles.bullet}>•</Text>

              <Text style={styles.summaryText}>
                <Text style={styles.summaryBold}>
                  Center translucency:
                </Text>{' '}
                Partial opacity observed in grain centers,
                consistent with ASV 5 classification.
              </Text>

            </View>

            <View style={styles.summaryRow}>

              <Text style={styles.bullet}>•</Text>

              <Text style={styles.summaryText}>
                <Text style={styles.summaryBold}>
                  Overall morphology:
                </Text>{' '}
                Grain shape retention with controlled
                spreading aligns with low gelatinization
                temperature.
              </Text>

            </View>

          </View>

        </View>

      </ScrollView>

      {/* ───────────────── FOOTER ───────────────── */}
      <View style={styles.footer}>

        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.85}
          onPress={() =>
            navigation?.navigate(
              'AiDraftResult',
              route?.params ?? {}
            )
          }
        >

          <Text style={styles.backBtnText}>
            Back to Results
          </Text>

        </TouchableOpacity>

      </View>

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

  // HEADER
  header: {
    backgroundColor: GREEN,
    paddingTop: 54,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    color: '#DCFCE7',
    fontSize: 13,
    marginTop: 2,
  },

  // SCROLL
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 14,
  },

  // INFO CARD
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },

  infoIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  infoIcon: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },

  infoTitle: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },

  infoBody: {
    color: '#2563EB',
    fontSize: 13,
    lineHeight: 20,
  },

  // TOGGLE CARD
  toggleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },

  toggleLeft: {
    flex: 1,
  },

  toggleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
  },

  toggleCenter: {
    flex: 1.2,
    paddingRight: 4,
  },

  toggleDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  // IMAGE CARD
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  overlayChip: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  overlayChipIcon: {
    color: GREEN,
    fontSize: 11,
  },

  overlayChipText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '700',
  },

  imageWrapper: {
    height: 360,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  placeholderContainer: {
    height: 360,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderEmoji: {
    fontSize: 44,
    marginBottom: 10,
  },

  placeholderText: {
    fontSize: 16,
    color: '#6B7280',
  },

  // HEATMAP
  heatmapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  heatBlob: {
    position: 'absolute',
    borderRadius: 999,
  },

  redBlob: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(248,113,113,0.40)',
  },

  orangeBlob: {
    width: 90,
    height: 90,
    backgroundColor: 'rgba(251,146,60,0.38)',
  },

  yellowBlob: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(250,204,21,0.32)',
  },

  greenBlob: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(74,222,128,0.28)',
  },

  // LEGEND
  legendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  legendTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 18,
  },

  legendList: {
    gap: 16,
  },

  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  legendColor: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },

  legendLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },

  legendDescription: {
    fontSize: 13,
    color: '#6B7280',
  },

  // SUMMARY
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 18,
  },

  summaryList: {
    gap: 16,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  bullet: {
    color: '#16A34A',
    fontSize: 22,
    lineHeight: 22,
  },

  summaryText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },

  summaryBold: {
    fontWeight: '700',
    color: '#111827',
  },

  // FOOTER
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  backBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },

  backBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

});