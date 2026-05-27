import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllCorrections } from '../services/CorrectionService';
import type { CorrectionLog } from '../db/repositories/CorrectionLogRepository';

const GREEN = '#008236';
const FILTER_OPTIONS = ['All Corrections', 'Today', 'This Week', 'This Month'];

type Direction = 'up' | 'down';

function getDirection(from: number, to: number): Direction {
  return to < from ? 'down' : 'up';
}

function ScoreChangeBadge({ from, to, direction }: { from: number; to: number; direction: Direction }) {
  const isDown = direction === 'down';
  return (
    <View style={[styles.changeBadge, isDown ? styles.changeBadgeDown : styles.changeBadgeUp]}>
      <Text style={[styles.changeBadgeText, isDown ? styles.changeBadgeTextDown : styles.changeBadgeTextUp]}>
        {isDown ? '↘' : '↗'} {from} → {to}
      </Text>
    </View>
  );
}

function CorrectionCard({ entry, onPress }: { entry: CorrectionLog; onPress: () => void }) {
  const direction = getDirection(entry.original_asv_score, entry.corrected_asv_score);
  return (
    <TouchableOpacity style={styles.correctionCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardTopLeft}>
          <Text style={styles.cardSampleId}>{entry.sample_id}</Text>
          <Text style={styles.cardSession}>{entry.session_id}</Text>
        </View>
        <ScoreChangeBadge from={entry.original_asv_score} to={entry.corrected_asv_score} direction={direction} />
      </View>
      <View style={styles.scoresRow}>
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreBlockLabel}>Original</Text>
          <View style={styles.aiScoreBubble}><Text style={styles.aiScoreText}>{entry.original_asv_score}</Text></View>
        </View>
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreBlockLabel}>Corrected ASV</Text>
          <View style={styles.correctedScoreBubble}><Text style={styles.correctedScoreText}>{entry.corrected_asv_score}</Text></View>
        </View>
      </View>
      <Text style={styles.cardReason}>{entry.correction_remark}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>👤 {entry.evaluator_id}</Text>
        <Text style={styles.cardFooterSep}>  </Text>
        <Text style={styles.cardFooterText}>📅 {new Date(entry.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
        <Text style={styles.cardChevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function CorrectionLogScreen({ navigation, route }: any) {
  const sessionId = route?.params?.sessionId;
  const [corrections, setCorrections] = useState<CorrectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Corrections');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        setLoading(true);
        try {
          const data = await getAllCorrections();
          const filtered = sessionId ? data.filter((c) => c.session_id === sessionId) : data;
          if (!cancelled) setCorrections(filtered);
        } catch (err) {
          console.error('CorrectionLogScreen load error:', err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return () => { cancelled = true; };
    }, [sessionId])
  );

  const filtered = corrections.filter((entry) => {
    const q = searchQuery.toLowerCase();
    return !q || entry.sample_id.toLowerCase().includes(q) || entry.correction_remark.toLowerCase().includes(q);
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Correction Log</Text>
          <Text style={styles.headerSubtitle}>Expert Override Audit Trail</Text>
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by sample or remark..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {FILTER_OPTIONS.map((option) => {
            const isActive = activeFilter === option;
            return (
              <TouchableOpacity key={option} style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => setActiveFilter(option)} activeOpacity={0.7}>
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={GREEN} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No corrections found.</Text>
            </View>
          ) : (
            filtered.map((entry) => (
              <CorrectionCard
                key={entry.id}
                entry={entry}
                onPress={() => navigation.navigate('SamplePreview', { id: entry.sample_id, sessionId: entry.session_id })}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: GREEN, paddingTop: 54, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { padding: 4 },
  backArrow: { color: '#FFFFFF', fontSize: 24 },
  headerCenter: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: '#D1FAE5', fontSize: 13, marginTop: 2 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: GREEN, paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  searchIcon: { fontSize: 15, color: '#9CA3AF' },
  searchInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#FFFFFF' },
  clearBtn: { padding: 4 },
  clearBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  filterBarWrapper: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: { borderRadius: 999, borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 16, paddingVertical: 7, backgroundColor: '#FFFFFF' },
  filterChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  filterChipTextActive: { color: '#FFFFFF' },
  listContent: { padding: 14, paddingBottom: 30, gap: 14 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyStateText: { color: '#9CA3AF', fontSize: 15 },
  correctionCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  cardTopLeft: { flex: 1, paddingRight: 8 },
  cardSampleId: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSession: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },
  changeBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  changeBadgeDown: { backgroundColor: '#EFF6FF' },
  changeBadgeUp: { backgroundColor: '#FFF1F2' },
  changeBadgeText: { fontSize: 12, fontWeight: '700' },
  changeBadgeTextDown: { color: '#2563EB' },
  changeBadgeTextUp: { color: '#E11D48' },
  scoresRow: { flexDirection: 'row', gap: 14, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 12 },
  scoreBlock: { alignItems: 'flex-start' },
  scoreBlockLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  aiScoreBubble: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  aiScoreText: { fontSize: 18, fontWeight: '700', color: '#374151' },
  correctedScoreBubble: { width: 40, height: 40, borderRadius: 10, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  correctedScoreText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  cardReason: { fontSize: 13, color: '#4B5563', lineHeight: 20, marginBottom: 14 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  cardFooterText: { fontSize: 12, color: '#6B7280' },
  cardFooterSep: { width: 10 },
  cardChevron: { fontSize: 22, color: '#D1D5DB', marginLeft: 'auto' },
});