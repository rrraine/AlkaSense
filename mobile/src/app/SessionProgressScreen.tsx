import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Modal, Platform, ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { getSessionById, getSessionProgress } from '../services/SessionService';
import { SampleService } from '../services/SampleService';
import type { Session } from '../db/repositories/SessionRepository';
import type { Sample } from '../db/repositories/SampleRepository';

const GREEN = '#008236';
const GREEN_DARK = '#0E9F45';
const GREEN_MID = '#3DAA5D';
const ASV_RANGE = [1, 2, 3, 4, 5, 6, 7];
const CHART_HEIGHT = 160;
const Y_MAX = 4;
const Y_TICKS = [4, 3, 2, 1, 0];

const sampleService = new SampleService();

// ─── Animated Bar ─────────────────────────────────────────────

function AnimatedBar({ targetHeight, isEmpty, delay }: { targetHeight: number; isEmpty: boolean; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(anim, { toValue: targetHeight, tension: 55, friction: 7, useNativeDriver: false }),
    ]).start();
  }, [targetHeight, delay]);
  return (
    <Animated.View style={[styles.bar, { height: anim, opacity: isEmpty ? 0.18 : 1 }]} />
  );
}

function StatusBadge({ status }: { status: string }) {
  const badgeStyle =
    status === 'Confirmed' ? styles.badgeConfirmed :
    status === 'Image Submitted' ? styles.badgePending :
    styles.badgeRegistered;
  const textStyle =
    status === 'Confirmed' ? styles.badgeTextConfirmed :
    status === 'Image Submitted' ? styles.badgeTextPending :
    styles.badgeTextRegistered;
  return <View style={badgeStyle}><Text style={textStyle}>{status}</Text></View>;
}

function SampleCard({ sample, navigation, sessionId, sessionName }: { sample: Sample; navigation: any; sessionId: string; sessionName: string }) {
  function handleNavigation() {
    if (sample.status === 'Pending') {
      navigation.navigate('ImageCapture', {
        sampleId: sample.id,
        sample_identifier: sample.sample_identifier,
        variety: sample.rice_variety,
        grainCount: String(sample.grain_count),
        session: sessionName,
        sessionId,
      });
      return;
    }
    if (sample.status === 'Image Submitted') {
      navigation.navigate('ExpertObservation', {
        sampleId: sample.id,
        sample_identifier: sample.sample_identifier,
        variety: sample.rice_variety,
        grainCount: String(sample.grain_count),
        session: sessionName,
        sessionId,
      });
      return;
    }
    navigation.navigate('SamplePreview', { id: sample.id, sample_identifier: sample.sample_identifier, variety: sample.rice_variety, status: sample.status, asv: sample.asv_score });
  }
  return (
    <TouchableOpacity style={styles.sampleCard} activeOpacity={0.7} onPress={handleNavigation}>
      <View style={styles.sampleLeft}>
        <View style={styles.sampleTopRow}>
          <Text style={styles.sampleId}>{sample.sample_identifier}</Text>
          {sample.asv_score > 0 && (
            <View style={styles.asvPill}><Text style={styles.asvPillText}>ASV {sample.asv_score}</Text></View>
          )}
        </View>
        <Text style={styles.sampleVariety}>{sample.rice_variety}</Text>
        <Text style={styles.sampleTime}>{new Date(sample.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
      <View style={styles.sampleRight}>
        <StatusBadge status={sample.status} />
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

function ASVChart({ samples }: { samples: Sample[] }) {
  const distribution = ASV_RANGE.map((score) => ({
    score,
    count: samples.filter((s) => s.asv_score === score).length,
  }));
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>ASV Score Distribution</Text>
      <View style={styles.chartWrapper}>
        <View style={[styles.yAxis, { height: CHART_HEIGHT }]}>
          {Y_TICKS.map((val) => <Text key={val} style={styles.yLabel}>{val}</Text>)}
        </View>
        <View style={{ flex: 1 }}>
          <View style={[styles.plotArea, { height: CHART_HEIGHT }]}>
            {Y_TICKS.filter((v) => v > 0).map((val) => (
              <View key={val} style={[styles.gridLine, { bottom: (val / Y_MAX) * CHART_HEIGHT }]} />
            ))}
            <View style={styles.barsRow}>
              {distribution.map((item, i) => {
                const h = (item.count / Y_MAX) * CHART_HEIGHT;
                return (
                  <View key={item.score} style={styles.barCol}>
                    <AnimatedBar targetHeight={h} isEmpty={item.count === 0} delay={i * 60} />
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.xAxisLine} />
          <View style={styles.xLabelsRow}>
            {distribution.map((item) => (
              <View key={item.score} style={styles.barCol}>
                <Text style={styles.xLabel}>{item.score}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <Text style={styles.chartCaption}>
        {samples.filter((s) => s.status === 'Confirmed').length} completed evaluations across ASV 1–7 scale
      </Text>
    </View>
  );
}

export default function SessionProgressScreen({ navigation, route }: any) {
  const sessionId = route?.params?.sessionId;
  const sessionName = route?.params?.sessionName
  const [session, setSession] = useState<Session | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [progress, setProgress] = useState({ total: 0, confirmed: 0, pending: 0, imageSubmitted: 0, progress: 0 });
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [evaluationDate, setEvaluationDate] = useState(new Date());
  const [isDateOverridden, setIsDateOverridden] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        if (!sessionId) return;
        setLoading(true);
        try {
          const [sess, prog, samps] = await Promise.all([
            getSessionById(sessionId),
            getSessionProgress(sessionId),
            sampleService.getSamplesBySession(sessionId),
          ]);
          if (!cancelled) {
            setSession(sess);
            setProgress(prog);
            setSamples(samps);
            setEvaluationDate(new Date(sess.evaluation_date));
          }
        } catch (err) {
          console.error('SessionProgressScreen load error:', err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return () => { cancelled = true; };
    }, [sessionId])
  );

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={GREEN} size="large" />
      </View>
    );
  }

  return (
    <>
      <View style={styles.root}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerNav}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.navIcon}>←</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMenuVisible(true)}>
                <Text style={styles.navIcon}>☰</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sessionTitle}>{session?.name ?? 'Session'}</Text>
            <Text style={styles.sessionSubtitle}>
              Batch {session?.batch_identifier}
            </Text>
            <View style={styles.metaCombined}>
              <Text style={styles.metaText}>📅 {evaluationDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}{isDateOverridden ? ' ⚡' : ''}</Text>
              <View style={[styles.metaBadge, session?.status === 'Active' ? styles.metaBadgeActive : styles.metaBadgeCompleted]}>
                <Text style={styles.metaBadgeText}>{session?.status}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              {[
                { label: 'Total', value: progress.total },
                { label: 'Completed', value: progress.confirmed },
                { label: 'Img Submitted', value: progress.imageSubmitted },
                { label: 'Pending', value: progress.pending },
              ].map((stat) => (
                <View key={stat.label} style={styles.statItem}>
                  <Text style={styles.statNumber}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* BODY */}
          <View style={styles.body}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Session Progress Dashboard</Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={() => navigation.replace('SessionProgress', { sessionId })}>
                <Text style={styles.refreshText}>↻ Refresh</Text>
              </TouchableOpacity>
            </View>

            <ASVChart samples={samples} />

            <Text style={styles.listTitle}>Sample Status List ({progress.total})</Text>

            {samples.map((sample) => (
              <SampleCard key={sample.id} sample={sample} navigation={navigation} sessionId={sessionId} sessionName={session?.name ?? ''} />
            ))}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('BatchSummary', { sessionId })}>
                <Text style={styles.secondaryBtnText}>📊{'\n'}View Summary</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('CorrectionLog', { sessionId })}>
                <Text style={styles.secondaryBtnText}>📋{'\n'}Corrections</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.libraryBtn} onPress={() => navigation.navigate('ReferenceLibrary')}>
              <Text style={styles.libraryBtnText}>📖 ASV Reference Library</Text>
            </TouchableOpacity>

            <View style={{ height: 120 }} />
          </View>
        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('RegisterSample', {   sessionName: session?.name, sessionId, })}
            disabled={session?.status !== 'Active'}
          >
            <Text style={styles.registerBtnText}>+ Register New Sample</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MENU MODAL */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={menuStyles.overlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={menuStyles.sheet}>
            <Text style={menuStyles.title}>Session Options</Text>
            <TouchableOpacity style={menuStyles.item} onPress={() => { setMenuVisible(false); setShowDatePicker(true); }}>
              <Text style={menuStyles.itemIcon}>📅</Text>
              <View style={menuStyles.itemBody}>
                <Text style={menuStyles.itemTitle}>Evaluation Date Manual Override</Text>
                <Text style={menuStyles.itemSubtitle}>Backdate the evaluation date for this session.</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={menuStyles.cancel} onPress={() => setMenuVisible(false)}>
              <Text style={menuStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={evaluationDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) { setEvaluationDate(date); setIsDateOverridden(true); }
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: GREEN, paddingTop: 55, paddingHorizontal: 16, paddingBottom: 16 },
  headerNav: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  navIcon: { color: '#FFFFFF', fontSize: 24 },
  sessionTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  sessionSubtitle: { color: '#D1FAE5', marginTop: 4, marginBottom: 14, fontSize: 13 },
  metaCombined: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: GREEN_DARK, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14 },
  metaText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
  metaBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  metaBadgeActive: { backgroundColor: '#D1FAE5' },
  metaBadgeCompleted: { backgroundColor: 'rgba(255,255,255,0.2)' },
  metaBadgeText: { fontSize: 12, fontWeight: '700', color: '#166534' },
  statsRow: { backgroundColor: GREEN_MID, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNumber: { color: '#FFFFFF', fontSize: 34, fontWeight: '700' },
  statLabel: { color: '#E5E7EB', fontSize: 13 },
  body: { padding: 16 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  refreshBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  refreshText: { fontWeight: '600', color: '#111827' },
  chartCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 18 },
  chartTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },
  chartWrapper: { flexDirection: 'row', marginBottom: 8 },
  yAxis: { width: 28, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 6 },
  yLabel: { color: '#9CA3AF', fontSize: 12 },
  plotArea: { flex: 1, position: 'relative' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, borderStyle: 'dashed', borderWidth: 0.5, borderColor: '#D1D5DB' },
  barsRow: { position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 26, backgroundColor: '#16A34A', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  xAxisLine: { height: 1, backgroundColor: '#9CA3AF' },
  xLabelsRow: { flexDirection: 'row', marginTop: 6 },
  xLabel: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  chartCaption: { textAlign: 'center', color: '#6B7280', fontSize: 12, marginTop: 12 },
  listTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 14 },
  sampleCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sampleLeft: { flex: 1 },
  sampleTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sampleId: { fontSize: 15, fontWeight: '700', color: '#111827' },
  asvPill: { backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  asvPillText: { color: GREEN, fontWeight: '700', fontSize: 12 },
  sampleVariety: { fontSize: 14, color: '#4B5563', marginBottom: 2 },
  sampleTime: { fontSize: 12, color: '#9CA3AF' },
  sampleRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeConfirmed: { backgroundColor: '#D1FAE5', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  badgeTextConfirmed: { color: '#047857', fontWeight: '600', fontSize: 13 },
  badgePending: { backgroundColor: '#FEF3C7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  badgeTextPending: { color: '#B45309', fontWeight: '600', fontSize: 13 },
  badgeRegistered: { backgroundColor: '#E5E7EB', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  badgeTextRegistered: { color: '#4B5563', fontWeight: '600', fontSize: 13 },
  chevron: { fontSize: 26, color: '#9CA3AF' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 10, marginBottom: 14 },
  secondaryBtn: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', paddingVertical: 18, alignItems: 'center' },
  secondaryBtnText: { textAlign: 'center', fontWeight: '600', color: '#111827', lineHeight: 22, fontSize: 14 },
  libraryBtn: { borderWidth: 1, borderColor: '#93C5FD', backgroundColor: '#EFF6FF', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  libraryBtnText: { color: '#1D4ED8', fontWeight: '600', fontSize: 14 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', padding: 14, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  registerBtn: { backgroundColor: GREEN, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  registerBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

const menuStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 18 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  itemIcon: { fontSize: 22, marginTop: 2 },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  itemSubtitle: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  cancel: { marginTop: 4, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14 },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
});