import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';

const GREEN = '#008236';
const GREEN_DARK = '#0E9F45';
const GREEN_MID = '#3DAA5D';

// ─── Data ────────────────────────────────────────────────────────────────────

const SAMPLES = [
  {
    id: 'S001',
    variety: 'NSIC Rc 222',
    status: 'Confirmed',
    asv: 5,
    time: '14:32',
  },
  {
    id: 'S002',
    variety: 'PSB Rc 18',
    status: 'Confirmed',
    asv: 3,
    time: '14:18',
  },
  {
    id: 'S003',
    variety: 'NSIC Rc 160',
    status: 'Confirmed',
    asv: 4,
    time: '14:05',
    flagged: true,
  },
  {
    id: 'S004',
    variety: 'IR64',
    status: 'Pending',
  },
  {
    id: 'S005',
    variety: 'PSB Rc 82',
    status: 'Registered',
  },
] as const;

type Sample = (typeof SAMPLES)[number];

const ASV_RANGE = [1, 2, 3, 4, 5, 6, 7];

// ─── Animated Bar ────────────────────────────────────────────────────────────

function AnimatedBar({
  targetHeight,
  isEmpty,
  delay,
}: {
  targetHeight: number;
  isEmpty: boolean;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(anim, {
        toValue: targetHeight,
        tension: 55,
        friction: 7,
        useNativeDriver: false,
      }),
    ]).start();
  }, [targetHeight, delay]);

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          height: anim,
          opacity: isEmpty ? 0.18 : 1,
        },
      ]}
    />
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const badgeStyle =
    status === 'Confirmed'
      ? styles.badgeConfirmed
      : status === 'Pending'
      ? styles.badgePending
      : styles.badgeRegistered;

  const textStyle =
    status === 'Confirmed'
      ? styles.badgeTextConfirmed
      : status === 'Pending'
      ? styles.badgeTextPending
      : styles.badgeTextRegistered;

  return (
    <View style={badgeStyle}>
      <Text style={textStyle}>{status}</Text>
    </View>
  );
}

// ─── Sample Card ─────────────────────────────────────────────────────────────

function SampleCard({
  sample,
  navigation,
}: {
  sample: Sample;
  navigation: any;
}) {
  function handleNavigation() {
    if (sample.status === 'Registered') {
      navigation.navigate('ImageCapture', {
        sampleId: sample.id,
        variety: sample.variety,
      });

      return;
    }

    if (sample.status === 'Pending') {
      navigation.navigate('ExpertObservation', {
        sampleId: sample.id,
        variety: sample.variety,
        asv: 'asv' in sample ? sample.asv : undefined,
      });

      return;
    }

    navigation.navigate('SamplePreview', {
      ...sample,
    });
  }

  return (
    <TouchableOpacity
      style={styles.sampleCard}
      activeOpacity={0.7}
      onPress={handleNavigation}
    >
      <View style={styles.sampleLeft}>

        <View style={styles.sampleTopRow}>

          <Text style={styles.sampleId}>
            {sample.id}
          </Text>

          {'asv' in sample && sample.asv != null && (
            <View style={styles.asvPill}>
              <Text style={styles.asvPillText}>
                ASV {sample.asv}
              </Text>
            </View>
          )}

          {'flagged' in sample && sample.flagged && (
            <Text style={styles.flagIcon}>⚠</Text>
          )}

        </View>

        <Text style={styles.sampleVariety}>
          {sample.variety}
        </Text>

        {'time' in sample && sample.time && (
          <Text style={styles.sampleTime}>
            Evaluated at {sample.time}
          </Text>
        )}

      </View>

      <View style={styles.sampleRight}>
        <StatusBadge status={sample.status} />
        <Text style={styles.chevron}>›</Text>
      </View>

    </TouchableOpacity>
  );
}

// ─── ASV Chart ───────────────────────────────────────────────────────────────

const CHART_HEIGHT = 160;
const Y_MAX = 4;
const Y_TICKS = [4, 3, 2, 1, 0];

function ASVChart() {
  const distribution = ASV_RANGE.map((score) => ({
    score,
    count: SAMPLES.filter((s) => 'asv' in s && s.asv === score).length,
  }));

  return (
    <View style={styles.chartCard}>

      <Text style={styles.chartTitle}>
        ASV Score Distribution
      </Text>

      <View style={styles.chartWrapper}>

        <View style={[styles.yAxis, { height: CHART_HEIGHT }]}>
          {Y_TICKS.map((val) => (
            <Text key={val} style={styles.yLabel}>
              {val}
            </Text>
          ))}
        </View>

        <View style={{ flex: 1 }}>

          <View style={[styles.plotArea, { height: CHART_HEIGHT }]}>

            {Y_TICKS.filter((v) => v > 0).map((val) => (
              <View
                key={val}
                style={[
                  styles.gridLine,
                  {
                    bottom: (val / Y_MAX) * CHART_HEIGHT,
                  },
                ]}
              />
            ))}

            <View style={styles.barsRow}>

              {distribution.map((item, i) => {
                const h = (item.count / Y_MAX) * CHART_HEIGHT;

                return (
                  <View key={item.score} style={styles.barCol}>
                    <AnimatedBar
                      targetHeight={h}
                      isEmpty={item.count === 0}
                      delay={i * 60}
                    />
                  </View>
                );
              })}

            </View>

          </View>

          <View style={styles.xAxisLine} />

          <View style={styles.xLabelsRow}>
            {distribution.map((item) => (
              <View key={item.score} style={styles.barCol}>
                <Text style={styles.xLabel}>
                  {item.score}
                </Text>
              </View>
            ))}
          </View>

        </View>

      </View>

      <Text style={styles.chartCaption}>
        3 completed evaluations across ASV 1–7 scale
      </Text>

    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SessionProgressScreen({ navigation }: any) {
  const total = SAMPLES.length;

  const completed = SAMPLES.filter(
    (s) => s.status === 'Confirmed'
  ).length;

  const pending = SAMPLES.filter(
    (s) => s.status === 'Pending'
  ).length;

  const flagged = SAMPLES.filter(
    (s) => 'flagged' in s && s.flagged
  ).length;

  return (
    <View style={styles.root}>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.header}>

          <View style={styles.headerNav}>

            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.navIcon}>←</Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={styles.navIcon}>☰</Text>
            </TouchableOpacity>

          </View>

          <Text style={styles.sessionTitle}>
            Spring Harvest 2026
          </Text>

          <Text style={styles.sessionSubtitle}>
            Session ALKA-2026-041 · Batch PR-2026-041
          </Text>

          <View style={styles.metaCombined}>
            <Text style={styles.metaText}>
              👤 Dr. Maria Santos
            </Text>

            <Text style={styles.metaText}>
              📅 May 15, 2026
            </Text>
          </View>

          <View style={styles.statsRow}>

            {[
              { label: 'Total', value: total },
              { label: 'Completed', value: completed },
              { label: 'Pending', value: pending },
              { label: 'Flagged', value: flagged },
            ].map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {stat.value}
                </Text>

                <Text style={styles.statLabel}>
                  {stat.label}
                </Text>
              </View>
            ))}

          </View>

        </View>

        {/* BODY */}
        <View style={styles.body}>

          <View style={styles.sectionRow}>

            <Text style={styles.sectionTitle}>
              Session Progress Dashboard
            </Text>

            <TouchableOpacity style={styles.refreshBtn}>
              <Text style={styles.refreshText}>
                ↻ Refresh
              </Text>
            </TouchableOpacity>

          </View>

          {flagged > 0 && (
            <View style={styles.flaggedCard}>

              <Text style={styles.flaggedTitle}>
                ⚠ Flagged Samples ({flagged})
              </Text>

              <Text style={styles.flaggedSubtitle}>
                The following samples have alerts that may require
                review before session closure.
              </Text>

              {SAMPLES.filter(
                (s) => 'flagged' in s && s.flagged
              ).map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.flaggedItem}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('SamplePreview', {
                      ...s,
                    })
                  }
                >
                  <View>

                    <Text style={styles.flaggedItemId}>
                      {s.id} · {s.variety}
                    </Text>

                    <Text style={styles.flaggedAlert}>
                      ▲ Low AI confidence (62%)
                    </Text>

                  </View>

                  <Text style={styles.chevron}>›</Text>

                </TouchableOpacity>
              ))}

            </View>
          )}

          <ASVChart />

          <Text style={styles.listTitle}>
            Sample Status List ({total})
          </Text>

          {SAMPLES.map((sample) => (
            <SampleCard
              key={sample.id}
              sample={sample}
              navigation={navigation}
            />
          ))}

          <View style={styles.actionRow}>

            <TouchableOpacity style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>
                📊{'\n'}View Summary
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('CorrectionLog')}>
              <Text style={styles.secondaryBtnText}>
                📋{'\n'}Corrections
              </Text>
            </TouchableOpacity>

          </View>

          <TouchableOpacity style={styles.libraryBtn} onPress={() => navigation.navigate('ReferenceLibrary')}>
            <Text style={styles.libraryBtnText}>
              📖 ASV Reference Library
            </Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />

        </View>

      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>

        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => navigation.navigate('RegisterSample')}
        >
          <Text style={styles.registerBtnText}>
            + Register New Sample
          </Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  header: {
    backgroundColor: GREEN,
    paddingTop: 55,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  navIcon: {
    color: '#FFFFFF',
    fontSize: 24,
  },

  sessionTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },

  sessionSubtitle: {
    color: '#D1FAE5',
    marginTop: 4,
    marginBottom: 14,
    fontSize: 13,
  },

  metaCombined: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: GREEN_DARK,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },

  metaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },

  statsRow: {
    backgroundColor: GREEN_MID,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  statItem: {
    alignItems: 'center',
  },

  statNumber: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
  },

  statLabel: {
    color: '#E5E7EB',
    fontSize: 13,
  },

  body: {
    padding: 16,
  },

  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  refreshBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  refreshText: {
    fontWeight: '600',
    color: '#111827',
  },

  flaggedCard: {
    backgroundColor: '#FFF8E8',
    borderWidth: 1,
    borderColor: '#F4B400',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },

  flaggedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 6,
  },

  flaggedSubtitle: {
    color: '#B45309',
    marginBottom: 14,
    lineHeight: 20,
    fontSize: 13,
  },

  flaggedItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FCD34D',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  flaggedItemId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },

  flaggedAlert: {
    color: '#B45309',
    marginTop: 4,
    fontSize: 13,
  },

  chevron: {
    fontSize: 26,
    color: '#9CA3AF',
  },

  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 18,
  },

  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },

  chartWrapper: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  yAxis: {
    width: 28,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
  },

  yLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },

  plotArea: {
    flex: 1,
    position: 'relative',
  },

  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
  },

  barsRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  bar: {
    width: 26,
    backgroundColor: '#16A34A',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },

  xAxisLine: {
    height: 1,
    backgroundColor: '#9CA3AF',
  },

  xLabelsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },

  xLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  chartCaption: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    marginTop: 12,
  },

  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },

  sampleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sampleLeft: {
    flex: 1,
  },

  sampleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },

  sampleId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  asvPill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  asvPillText: {
    color: GREEN,
    fontWeight: '700',
    fontSize: 12,
  },

  flagIcon: {
    color: '#F59E0B',
    fontSize: 16,
  },

  sampleVariety: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 2,
  },

  sampleTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  sampleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  badgeConfirmed: {
    backgroundColor: '#D1FAE5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  badgeTextConfirmed: {
    color: '#047857',
    fontWeight: '600',
    fontSize: 13,
  },

  badgePending: {
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  badgeTextPending: {
    color: '#B45309',
    fontWeight: '600',
    fontSize: 13,
  },

  badgeRegistered: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  badgeTextRegistered: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 13,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 14,
  },

  secondaryBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 18,
    alignItems: 'center',
  },

  secondaryBtnText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
    fontSize: 14,
  },

  libraryBtn: {
    borderWidth: 1,
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },

  libraryBtnText: {
    color: '#1D4ED8',
    fontWeight: '600',
    fontSize: 14,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  registerBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },

  registerBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});