import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';

import Svg, { Path } from 'react-native-svg';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const GREEN = '#008236';

const SESSION_INFO = {
  sessionName: 'Spring Harvest 2026',
  sessionId: 'ALKA-2026-041',
  evaluator: 'Dr. Maria Santos',
  evaluatorId: 'eval-001',
  startTime: '5/15/2026, 4:00:00 PM',
  endTime: '5/15/2026, 6:34:00 PM',
  duration: '2h 34m',
  generated: '5/15/2026, 6:34:15 PM',
};

const STATS = [
  { value: 18, label: 'Classified', icon: '✓', color: '#008236', bg: '#F0FDF4', iconBg: '#008236' },
  { value: 3, label: 'Rejected', icon: '✕', color: '#DC2626', bg: '#FEF2F2', iconBg: '#DC2626' },
  { value: 24, label: 'Total Submitted', icon: '▦', color: '#1D4ED8', bg: '#EFF6FF', iconBg: '#1D4ED8' },
  { value: 2, label: 'Expert Corrections', icon: '◷', color: '#B45309', bg: '#FFF8E8', iconBg: '#D97706' },
];

const ASV_DISTRIBUTION = [0, 1, 2, 5, 6, 2, 1];
const ASV_MAX = 8;

const GT_SLICES = [
  { value: 6, color: '#EF4444', label: 'High GT' },
  { value: 78, color: '#F59E0B', label: 'Intermediate GT' },
  { value: 17, color: '#3B82F6', label: 'Low GT' },
];

const TREATMENT = {
  koh: '1.7%',
  temperature: '30°C',
  duration: '23h',
  protocol: 'IRRI Standard',
};

// ─────────────────────────────────────────────────────────────
// PIE CHART HELPERS (FIXED SVG)
// ─────────────────────────────────────────────────────────────

const SIZE = 170;
const R = SIZE / 2;

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arc(cx: number, cy: number, r: number, start: number, end: number) {
  const startPt = polar(cx, cy, r, end);
  const endPt = polar(cx, cy, r, start);
  const largeArc = end - start > 180 ? 1 : 0;

  return `
    M ${cx} ${cy}
    L ${startPt.x} ${startPt.y}
    A ${r} ${r} 0 ${largeArc} 0 ${endPt.x} ${endPt.y}
    Z
  `;
}

// ─────────────────────────────────────────────────────────────
// PIE CHART (WITH HORIZONTAL LEGEND)
// ─────────────────────────────────────────────────────────────

function PieChart() {
  const total = GT_SLICES.reduce((a, b) => a + b.value, 0);

  let cursor = 0;

  const slices = GT_SLICES.map((s) => {
    const angle = (s.value / total) * 360;
    const slice = {
      ...s,
      start: cursor,
      end: cursor + angle,
    };
    cursor += angle;
    return slice;
  });

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>GT Classification Distribution</Text>

      <View style={{ alignItems: 'center' }}>
        <Svg width={SIZE} height={SIZE}>
          {slices.map((s, i) => (
            <Path key={i} d={arc(R, R, R, s.start, s.end)} fill={s.color} />
          ))}
        </Svg>
      </View>

      {/* ✅ HORIZONTAL LEGEND */}
      <View style={styles.pieLegendRow}>
        {GT_SLICES.map((s) => (
          <View key={s.label} style={styles.legendItemRow}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ANIMATED BAR CHART (RESTORED)
// ─────────────────────────────────────────────────────────────

function AnimatedBarChart() {
  const animValues = useRef(
    ASV_DISTRIBUTION.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = animValues.map((v, i) =>
      Animated.spring(v, {
        toValue: (ASV_DISTRIBUTION[i] / ASV_MAX) * 140,
        friction: 7,
        tension: 50,
        delay: i * 80,
        useNativeDriver: false,
      })
    );

    Animated.stagger(60, animations).start();
  }, []);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>ASV Distribution</Text>

      <View style={{ flexDirection: 'row', height: 160, alignItems: 'flex-end' }}>
        {ASV_DISTRIBUTION.map((_, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Animated.View
              style={{
                width: 22,
                height: animValues[i],
                backgroundColor: '#16A34A',
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
              }}
            />
            <Text style={{ fontSize: 12, marginTop: 4 }}>{i + 1}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────

export default function BatchSummaryScreen({ navigation }: any) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Batch Summary</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>

        {/* SESSION */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Session Information</Text>
          <Text>{SESSION_INFO.sessionName}</Text>
          <Text>{SESSION_INFO.sessionId}</Text>
        </View>

        {/* STATS */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {STATS.map((s, i) => (
            <View key={i} style={{ width: '48%' }}>
              <View style={[styles.statCard, { backgroundColor: s.bg }]}>
                <View style={[styles.statIconBox, { backgroundColor: s.iconBg }]}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{s.icon}</Text>
                </View>

                <View>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: s.color }}>
                    {s.value}
                  </Text>
                  <Text style={{ fontSize: 12 }}>{s.label}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* CHARTS */}
        <AnimatedBarChart />
        <PieChart />

        {/* TREATMENT PARAMETERS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Treatment Parameters</Text>

          <View style={styles.treatmentGrid}>
            <View style={styles.treatmentItem}>
              <Text style={styles.treatmentLabel}>KOH:</Text>
              <Text style={styles.treatmentValue}>{TREATMENT.koh}</Text>
            </View>

            <View style={styles.treatmentItem}>
              <Text style={styles.treatmentLabel}>Duration:</Text>
              <Text style={styles.treatmentValue}>{TREATMENT.duration}</Text>
            </View>

            <View style={styles.treatmentItem}>
              <Text style={styles.treatmentLabel}>Temperature:</Text>
              <Text style={styles.treatmentValue}>{TREATMENT.temperature}</Text>
            </View>

            <View style={styles.treatmentItem}>
              <Text style={styles.treatmentLabel}>Protocol:</Text>
              <Text style={styles.treatmentValue}>{TREATMENT.protocol}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.exportBtn}>
          <Text style={styles.exportIcon}>⬇</Text>
          <Text style={styles.exportBtnText}>Export CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.uploadBtn}>
          <Text style={styles.uploadIcon}>⬆</Text>
          <Text style={styles.uploadBtnText}>Upload Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES (ONLY ADDITIONS FOR LEGEND)
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    backgroundColor: GREEN,
    paddingTop: 50,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },

  statCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  treatmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  treatmentItem: {
    width: '50%',
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },

  treatmentLabel: {
    fontSize: 13,
    color: '#6B7280',
  },

  treatmentValue: {
    fontSize: 13,
    fontWeight: '600',
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },

  exportBtn: {
    flex: 1,
    backgroundColor: GREEN,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },

  exportIcon: { color: '#fff', fontSize: 16 },
  exportBtnText: { color: '#fff', fontWeight: '700' },

  uploadBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  uploadIcon: { color: '#374151', fontSize: 16 },

  uploadBtnText: {
    color: '#374151',
    fontWeight: '700',
  },

  // ✅ LEGEND (NEW)
  pieLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 14,
  },

  legendItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  legendText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
});