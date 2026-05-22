import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const GREEN = '#008236';

const RICE_VARIETIES = [
  'All varieties',
  'NSIC Rc 222',
  'NSIC Rc 160',
  'PSB Rc 18',
  'PSB Rc 82',
  'IR64',
];

const ANOMALY_OPTIONS = [
  'No Anomaly',
  'Longitudinal Cracking',
  'Floating Grains',
  'Unilateral Spreading',
];

const ASV_RANGE = [1, 2, 3, 4, 5, 6, 7];

function getGTLabel(asv: number): { label: string; color: string; bg: string } {
  if (asv <= 2) return { label: 'High GT',  color: '#1D4ED8', bg: '#DBEAFE' };
  if (asv <= 5) return { label: 'Intermediate GT', color: '#92400E', bg: '#FEF3C7' };
  return          { label: 'Low GT',   color: '#065F46', bg: '#D1FAE5' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

interface LibraryEntry {
  id: string;
  asv: number;
  variety: string;
  date: string;
  tags: Array<'ai_draft' | 'evidence' | 'deviated'>;
  anomaly?: string;
}

const LIBRARY: LibraryEntry[] = [
  {
    id: 'L001',
    asv: 5,
    variety: 'NSIC Rc 222',
    date: 'May 15, 2026',
    tags: ['ai_draft', 'evidence'],
  },
  {
    id: 'L002',
    asv: 3,
    variety: 'IR64',
    date: 'May 14, 2026',
    tags: [],
  },
  {
    id: 'L003',
    asv: 7,
    variety: 'NSIC Rc 222',
    date: 'May 14, 2026',
    tags: ['ai_draft', 'deviated', 'evidence'],
    anomaly: 'Longitudinal Cracking',
  },
  {
    id: 'L004',
    asv: 8,
    variety: 'NSIC Rc 222',
    date: 'May 14, 2026',
    tags: ['ai_draft', 'deviated', 'evidence'],
    anomaly: 'Floating Grains',
  },
  {
    id: 'L005',
    asv: 2,
    variety: 'PSB Rc 18',
    date: 'May 13, 2026',
    tags: ['evidence'],
  },
  {
    id: 'L006',
    asv: 4,
    variety: 'NSIC Rc 160',
    date: 'May 13, 2026',
    tags: ['ai_draft'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function TagChip({ type }: { type: 'ai_draft' | 'evidence' | 'deviated' }) {
  const configs = {
    ai_draft: { label: '✦ AI Draft', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    evidence: { label: '👁 Evidence', color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
    deviated: { label: '⚠ Deviated', color: '#B45309', bg: '#FFF8E8', border: '#FCD34D' },
  };
  const c = configs[type];
  return (
    <View style={[styles.tagChip, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.tagChipText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

function GrainPlaceholder() {
  return (
    <View style={styles.grainPlaceholder}>
      {/* Simple rice grain silhouette using views */}
      <View style={styles.grainBody}>
        <View style={styles.grainInner} />
      </View>
      <View style={styles.grainStalk} />
    </View>
  );
}

function LibraryCard({ entry, onPress }: { entry: LibraryEntry; onPress: () => void }) {
  const gt = getGTLabel(entry.asv);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Grain image placeholder */}
      <View style={styles.cardImageBox}>
        <GrainPlaceholder />
      </View>

      <View style={styles.cardBody}>
        {/* ASV + GT badge */}
        <View style={styles.cardTopRow}>
          <Text style={styles.cardASV}>ASV {entry.asv}</Text>
          <View style={[styles.gtBadge, { backgroundColor: gt.bg }]}>
            <Text style={[styles.gtBadgeText, { color: gt.color }]}>{gt.label}</Text>
          </View>
        </View>

        <Text style={styles.cardVariety}>{entry.variety}</Text>

        <View style={styles.cardDateRow}>
          <Text style={styles.cardDateIcon}>📅</Text>
          <Text style={styles.cardDate}>{entry.date}</Text>
        </View>

        {/* Tags row */}
        {entry.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {entry.tags.map((t) => (
              <TagChip key={t} type={t} />
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter Panel
// ─────────────────────────────────────────────────────────────────────────────

function FilterPanel({
  selectedASV,
  onToggleASV,
  selectedVariety,
  onSelectVariety,
  selectedAnomalies,
  onToggleAnomaly,
  varietyDropdownOpen,
  onToggleVarietyDropdown,
}: {
  selectedASV: number[];
  onToggleASV: (v: number) => void;
  selectedVariety: string;
  onSelectVariety: (v: string) => void;
  selectedAnomalies: string[];
  onToggleAnomaly: (v: string) => void;
  varietyDropdownOpen: boolean;
  onToggleVarietyDropdown: () => void;
}) {
  return (
    <View style={styles.filterPanel}>
      {/* ASV Score */}
      <Text style={styles.filterGroupLabel}>ASV Score</Text>
      <View style={styles.asvRow}>
        {ASV_RANGE.map((v) => {
          const active = selectedASV.includes(v);
          return (
            <TouchableOpacity
              key={v}
              style={[styles.asvChip, active && styles.asvChipActive]}
              onPress={() => onToggleASV(v)}
              activeOpacity={0.7}
            >
              <Text style={[styles.asvChipText, active && styles.asvChipTextActive]}>
                {v}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rice Variety */}
      <Text style={[styles.filterGroupLabel, { marginTop: 18 }]}>Rice Variety</Text>
      <TouchableOpacity
        style={styles.varietyDropdownTrigger}
        onPress={onToggleVarietyDropdown}
        activeOpacity={0.8}
      >
        <Text style={styles.varietyDropdownValue}>{selectedVariety}</Text>
        <Text style={styles.varietyDropdownArrow}>
          {varietyDropdownOpen ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {varietyDropdownOpen && (
        <View style={styles.varietyDropdownList}>
          {RICE_VARIETIES.map((v) => (
            <TouchableOpacity
              key={v}
              style={[
                styles.varietyDropdownItem,
                v === selectedVariety && styles.varietyDropdownItemActive,
              ]}
              onPress={() => {
                onSelectVariety(v);
                onToggleVarietyDropdown();
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.varietyDropdownItemText,
                  v === selectedVariety && styles.varietyDropdownItemTextActive,
                ]}
              >
                {v}
              </Text>
              {v === selectedVariety && (
                <Text style={styles.varietyCheckmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Anomaly Flags */}
      <Text style={[styles.filterGroupLabel, { marginTop: 18 }]}>Anomaly Flags</Text>
      {ANOMALY_OPTIONS.map((a) => {
        const checked = selectedAnomalies.includes(a);
        return (
          <TouchableOpacity
            key={a}
            style={styles.checkboxRow}
            onPress={() => onToggleAnomaly(a)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
              {checked && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>{a}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ReferenceLibraryScreen({ navigation }: any) {
  const [search, setSearch]             = useState('');
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const [selectedASV, setSelectedASV]   = useState<number[]>([]);
  const [selectedVariety, setSelectedVariety] = useState('All varieties');
  const [selectedAnomalies, setSelectedAnomalies] = useState<string[]>([]);
  const [varietyDropdownOpen, setVarietyDropdownOpen] = useState(false);

  const rotateAnim = useRef(new Animated.Value(0)).current;

  function toggleFilters() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = !filtersOpen;
    setFiltersOpen(next);
    if (varietyDropdownOpen && !next) setVarietyDropdownOpen(false);
    Animated.timing(rotateAnim, {
      toValue: next ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }

  function toggleASV(v: number) {
    setSelectedASV((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  function toggleAnomaly(a: string) {
    setSelectedAnomalies((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }

  const arrowRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Active filter count (for badge)
  const activeFilterCount =
    selectedASV.length +
    (selectedVariety !== 'All varieties' ? 1 : 0) +
    selectedAnomalies.length;

  // Filter the entries
  const filtered = LIBRARY.filter((entry) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      entry.variety.toLowerCase().includes(q) ||
      String(entry.asv).includes(q) ||
      entry.date.toLowerCase().includes(q);

    const matchASV      = selectedASV.length === 0 || selectedASV.includes(entry.asv);
    const matchVariety  = selectedVariety === 'All varieties' || entry.variety === selectedVariety;
    const matchAnomaly  =
      selectedAnomalies.length === 0 ||
      selectedAnomalies.some((a) =>
        a === 'No Anomaly' ? !entry.anomaly : entry.anomaly === a
      );

    return matchSearch && matchASV && matchVariety && matchAnomaly;
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── STATIC TOP SECTION (never scrolls) ─────────────────────────────── */}
      <View>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Reference Library</Text>
            <Text style={styles.headerSubtitle}>{filtered.length} confirmed cases</Text>
          </View>
        </View>

        {/* SEARCH */}
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by variety, session, or observations..."
            placeholderTextColor="#fcfcfc"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FILTERS TOGGLE BUTTON */}
        <TouchableOpacity
          style={[styles.filtersBtn, filtersOpen && styles.filtersBtnOpen]}
          onPress={toggleFilters}
          activeOpacity={0.8}
        >
          <Text style={[styles.filtersBtnIcon, filtersOpen && styles.filtersBtnIconOpen]}>⊟</Text>
          <Text style={[styles.filtersBtnLabel, filtersOpen && styles.filtersBtnLabelOpen]}>
            Filters
          </Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
          <Animated.Text
            style={[
              styles.filtersBtnArrow,
              filtersOpen && styles.filtersBtnArrowOpen,
              { transform: [{ rotate: arrowRotation }] },
            ]}
          >
            ▼
          </Animated.Text>
        </TouchableOpacity>

        {/* FILTER PANEL — static, expands below the button */}
        {filtersOpen && (
          <View style={styles.filterPanelWrapper}>
            <FilterPanel
              selectedASV={selectedASV}
              onToggleASV={toggleASV}
              selectedVariety={selectedVariety}
              onSelectVariety={setSelectedVariety}
              selectedAnomalies={selectedAnomalies}
              onToggleAnomaly={toggleAnomaly}
              varietyDropdownOpen={varietyDropdownOpen}
              onToggleVarietyDropdown={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setVarietyDropdownOpen((v) => !v);
              }}
            />
          </View>
        )}

        {/* ACTIVE FILTER PILLS — static, just below filter panel */}
        {activeFilterCount > 0 && (
          <View style={styles.activePillsRow}>
            {selectedASV.map((v) => (
              <TouchableOpacity
                key={`asv-${v}`}
                style={styles.activePill}
                onPress={() => toggleASV(v)}
              >
                <Text style={styles.activePillText}>ASV {v}  ✕</Text>
              </TouchableOpacity>
            ))}
            {selectedVariety !== 'All varieties' && (
              <TouchableOpacity
                style={styles.activePill}
                onPress={() => setSelectedVariety('All varieties')}
              >
                <Text style={styles.activePillText}>{selectedVariety}  ✕</Text>
              </TouchableOpacity>
            )}
            {selectedAnomalies.map((a) => (
              <TouchableOpacity
                key={a}
                style={styles.activePill}
                onPress={() => toggleAnomaly(a)}
              >
                <Text style={styles.activePillText}>{a}  ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── SCROLLABLE CARDS ONLY ──────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No entries match your filters.</Text>
          </View>
        ) : (
          filtered.map((entry) => (
            <LibraryCard
              key={entry.id}
              entry={entry}
              onPress={() =>
                navigation.navigate('SamplePreview', {
                  id: entry.id,
                  variety: entry.variety,
                  asv: entry.asv,
                })
              }
            />
          ))
        )}

        <View style={{ height: 30 }} />
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
    gap: 12,
  },

  backBtn: { padding: 4 },

  backArrow: {
    color: '#FFFFFF',
    fontSize: 24,
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
    fontSize: 14,
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    padding: 4,
  },

  // ── Filters Button ───────────────────────────────────────────────────────────
  filtersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },

  filtersBtnOpen: {
    backgroundColor: '#F0FDF4',
    borderColor: GREEN,
  },

  filtersBtnIcon: {
    fontSize: 16,
    color: '#374151',
  },

  filtersBtnIconOpen: {
    color: GREEN,
  },

  filtersBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },

  filtersBtnLabelOpen: {
    color: GREEN,
  },

  filterBadge: {
    backgroundColor: GREEN,
    borderRadius: 999,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  filtersBtnArrow: {
    fontSize: 10,
    color: '#374151',
  },

  filtersBtnArrowOpen: {
    color: GREEN,
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },

  // ── Filter Panel ─────────────────────────────────────────────────────────────
  filterPanelWrapper: {
    marginHorizontal: 14,
    marginBottom: 12,
  },

  filterPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },

  filterGroupLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },

  // ASV chips
  asvRow: {
    flexDirection: 'row',
    gap: 8,
  },

  asvChip: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  asvChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  asvChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },

  asvChipTextActive: {
    color: '#FFFFFF',
  },

  // Variety dropdown
  varietyDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },

  varietyDropdownValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  varietyDropdownArrow: {
    fontSize: 11,
    color: '#6B7280',
  },

  varietyDropdownList: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },

  varietyDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  varietyDropdownItemActive: {
    backgroundColor: '#F0FDF4',
  },

  varietyDropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },

  varietyDropdownItemTextActive: {
    color: GREEN,
    fontWeight: '700',
  },

  varietyCheckmark: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '700',
  },

  // Anomaly checkboxes
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  // ── Active filter pills ───────────────────────────────────────────────────────
  activePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },

  activePill: {
    backgroundColor: '#D1FAE5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },

  activePillText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Library Card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    marginBottom: 12,
    gap: 14,
  },

  // Grain image placeholder
  cardImageBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  grainPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 60,
  },

  grainBody: {
    width: 28,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#D4A853',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A0721A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },

  grainInner: {
    width: 10,
    height: 28,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  grainStalk: {
    width: 3,
    height: 14,
    backgroundColor: '#6B9E3A',
    borderRadius: 2,
    marginTop: -2,
  },

  cardBody: {
    flex: 1,
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },

  cardASV: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  gtBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },

  gtBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  cardVariety: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },

  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },

  cardDateIcon: {
    fontSize: 12,
  },

  cardDate: {
    fontSize: 12,
    color: '#6B7280',
  },

  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  tagChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Empty State ───────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },

  emptyStateText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
});