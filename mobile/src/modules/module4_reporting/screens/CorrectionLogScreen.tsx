import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const GREEN = '#008236';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Data
// ─────────────────────────────────────────────────────────────────────────────

type Direction = 'up' | 'down';

interface CorrectionEntry {
  id: string;
  sampleId: string;
  variety: string;
  session: string;
  aiScore: number;
  correctedScore: number;
  direction: Direction;
  reason: string;
  evaluator: string;
  date: string;
}

const CORRECTION_LOG: CorrectionEntry[] = [
  {
    id: 'c1',
    sampleId: 'S012',
    variety: 'NSIC Rc 222',
    session: 'ALKA-2026-041',
    aiScore: 5,
    correctedScore: 4,
    direction: 'down',
    reason:
      'Edge spreading less pronounced than AI assessment. Manual observation shows characteristics more consistent with ASV 4.',
    evaluator: 'Dr. Maria Santos',
    date: 'May 15, 2026 14:32',
  },
  {
    id: 'c2',
    sampleId: 'S007',
    variety: 'PSB Rc 18',
    session: 'ALKA-2026-041',
    aiScore: 3,
    correctedScore: 4,
    direction: 'up',
    reason:
      'Center translucency more evident upon closer inspection. Moderate spreading pattern aligns with ASV 4.',
    evaluator: 'Dr. Maria Santos',
    date: 'May 15, 2026 13:18',
  },
  {
    id: 'c3',
    sampleId: 'S003',
    variety: 'IR64',
    session: 'ALKA-2026-040',
    aiScore: 6,
    correctedScore: 5,
    direction: 'down',
    reason:
      'Spreading pattern not as extensive as suggested by AI. Grain structure retention indicates ASV 5.',
    evaluator: 'Dr. Juan Reyes',
    date: 'May 14, 2026 16:45',
  },
  {
    id: 'c4',
    sampleId: 'S019',
    variety: 'NSIC Rc 160',
    session: 'ALKA-2026-040',
    aiScore: 2,
    correctedScore: 3,
    direction: 'up',
    reason:
      'Re-examined under improved lighting. Translucency and edge diffusion indicate ASV 3 more accurately.',
    evaluator: 'Dr. Juan Reyes',
    date: 'May 14, 2026 15:10',
  },
];

const FILTER_OPTIONS = ['All Corrections', 'Today', 'This Week', 'This Month'];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ScoreChangeBadge({
  from,
  to,
  direction,
}: {
  from: number;
  to: number;
  direction: Direction;
}) {
  const isDown = direction === 'down';
  return (
    <View style={[styles.changeBadge, isDown ? styles.changeBadgeDown : styles.changeBadgeUp]}>
      <Text style={[styles.changeBadgeText, isDown ? styles.changeBadgeTextDown : styles.changeBadgeTextUp]}>
        {isDown ? '↘' : '↗'} {from} → {to}
      </Text>
    </View>
  );
}

function CorrectionCard({
  entry,
  onPress,
}: {
  entry: CorrectionEntry;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.correctionCard}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Top row: sample ID + change badge */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardTopLeft}>
          <Text style={styles.cardSampleId}>
            {entry.sampleId}
            <Text style={styles.cardDot}> · </Text>
            <Text style={styles.cardVariety}>{entry.variety}</Text>
          </Text>
          <Text style={styles.cardSession}>{entry.session}</Text>
        </View>

        <ScoreChangeBadge
          from={entry.aiScore}
          to={entry.correctedScore}
          direction={entry.direction}
        />
      </View>

      {/* Score comparison */}
      <View style={styles.scoresRow}>
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreBlockLabel}>AI Predicted</Text>
          <View style={styles.aiScoreBubble}>
            <Text style={styles.aiScoreText}>{entry.aiScore}</Text>
          </View>
        </View>

        <View style={styles.scoreBlock}>
          <Text style={styles.scoreBlockLabel}>Corrected ASV</Text>
          <View style={styles.correctedScoreBubble}>
            <Text style={styles.correctedScoreText}>{entry.correctedScore}</Text>
          </View>
        </View>
      </View>

      {/* Reason */}
      <Text style={styles.cardReason}>{entry.reason}</Text>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>👤 {entry.evaluator}</Text>
        <Text style={styles.cardFooterSep}>  </Text>
        <Text style={styles.cardFooterText}>📅 {entry.date}</Text>
        <Text style={styles.cardChevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function CorrectionLogScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery]   = useState('');
  const [activeFilter, setActiveFilter] = useState('All Corrections');

  // Filter logic — extend when backend is available
  const filtered = CORRECTION_LOG.filter((entry) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      entry.sampleId.toLowerCase().includes(q) ||
      entry.variety.toLowerCase().includes(q) ||
      entry.evaluator.toLowerCase().includes(q);

    let matchesFilter = true;
    if (activeFilter === 'Downward') matchesFilter = entry.direction === 'down';
    if (activeFilter === 'Upward')   matchesFilter = entry.direction === 'up';
    // "Today" / "This Week" / "This Month" — wire to real date logic when backend ready
    return matchesSearch && matchesFilter;
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Correction Log</Text>
          <Text style={styles.headerSubtitle}>Expert Override Audit Trail</Text>
        </View>
      </View>

      {/* ── SEARCH ─────────────────────────────────────────────────────────── */}
      <View style={styles.searchWrapper}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by sample or variety..."
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

      {/* ── FILTER BAR (horizontal scrollable) ────────────────────────────── */}
      <View style={styles.filterBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {/* Funnel icon */}
          <View style={styles.filterFunnelIcon}>
            <Text style={styles.filterFunnelText}>⊟</Text>
          </View>

          {FILTER_OPTIONS.map((option) => {
            const isActive = activeFilter === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(option)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Export button — always visible at end */}
          <TouchableOpacity
            style={styles.exportBtn}
            activeOpacity={0.75}
            // TODO: wire to export handler
          >
            <Text style={styles.exportIcon}>Export</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── CORRECTION LIST ─────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No corrections found.</Text>
          </View>
        ) : (
          filtered.map((entry) => (
            <CorrectionCard
              key={entry.id}
              entry={entry}
              onPress={() =>
                navigation.navigate('SamplePreview', {
                  sampleId: entry.sampleId,
                  variety: entry.variety,
                  originalASV: entry.correctedScore,
                })
              }
            />
          ))
        )}
      </ScrollView>
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
    paddingBottom: 16,
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
    fontSize: 22,
    fontWeight: '800',
  },

  headerSubtitle: {
    color: '#D1FAE5',
    fontSize: 13,
    marginTop: 2,
  },

  // ── Search ───────────────────────────────────────────────────────────────────
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREEN,
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },

  searchIcon: {
    fontSize: 15,
    color: '#9CA3AF',
  },

  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFFFFF',
  },

  clearBtn: {
    padding: 4,
  },

  clearBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Filter Bar ───────────────────────────────────────────────────────────────
  filterBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },

  filterFunnelIcon: {
    paddingRight: 4,
  },

  filterFunnelText: {
    fontSize: 17,
    color: '#6B7280',
  },

  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },

  filterChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  exportBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  exportIcon: {
    fontSize: 15,
    color: '#374151',
  },

  // ── List ─────────────────────────────────────────────────────────────────────
  listContent: {
    padding: 14,
    paddingBottom: 30,
    gap: 14,
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },

  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 15,
  },

  // ── Correction Card ───────────────────────────────────────────────────────────
  correctionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  cardTopLeft: {
    flex: 1,
    paddingRight: 8,
  },

  cardSampleId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  cardDot: {
    color: '#9CA3AF',
    fontWeight: '400',
  },

  cardVariety: {
    fontWeight: '500',
    color: '#374151',
    fontSize: 14,
  },

  cardSession: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 3,
  },

  // Change badge
  changeBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  changeBadgeDown: {
    backgroundColor: '#EFF6FF',
  },

  changeBadgeUp: {
    backgroundColor: '#FFF1F2',
  },

  changeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  changeBadgeTextDown: {
    color: '#2563EB',
  },

  changeBadgeTextUp: {
    color: '#E11D48',
  },

  // Score blocks
  scoresRow: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  scoreBlock: {
    alignItems: 'flex-start',
  },

  scoreBlockLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  aiScoreBubble: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiScoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },

  correctedScoreBubble: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  correctedScoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Reason text
  cardReason: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 14,
  },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },

  cardFooterText: {
    fontSize: 12,
    color: '#6B7280',
  },

  cardFooterSep: {
    width: 10,
  },

  cardChevron: {
    fontSize: 22,
    color: '#D1D5DB',
    marginLeft: 'auto',
  },
});