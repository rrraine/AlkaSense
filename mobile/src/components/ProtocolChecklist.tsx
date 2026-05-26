import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ProtocolState {
  uvLight: boolean;
  whiteTray: boolean;
  singleLayer: boolean;
  frameAligned: boolean;
}

export const INITIAL_PROTOCOL_STATE: ProtocolState = {
  uvLight: false,
  whiteTray: false,
  singleLayer: false,
  frameAligned: false,
};

export function allProtocolPassed(state: ProtocolState): boolean {
  return (
    state.uvLight &&
    state.whiteTray &&
    state.singleLayer &&
    state.frameAligned
  );
}

interface ChecklistItem {
  key: keyof ProtocolState;
  label: string;
  description: string;
  icon: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    key: 'uvLight',
    label: 'UV / Blacklight illumination',
    description: 'Confirm UV or blacklight is active over the sample',
    icon: '◈',
  },
  {
    key: 'whiteTray',
    label: 'White tray background',
    description: 'Grains must rest on a white tray for accurate contrast',
    icon: '▭',
  },
  {
    key: 'singleLayer',
    label: 'Grains in single layer',
    description: 'No overlapping or stacked grains in the sample area',
    icon: '⠿',
  },
  {
    key: 'frameAligned',
    label: 'Petri dish within frame',
    description: 'Petri dish fully visible and centred in capture area',
    icon: '◎',
  },
];

// ─────────────────────────────────────────────────────────────
// Sub-component: single checklist row
// ─────────────────────────────────────────────────────────────

interface CheckRowProps {
  item: ChecklistItem;
  checked: boolean;
  onToggle: (key: keyof ProtocolState) => void;
}

function CheckRow({ item, checked, onToggle }: CheckRowProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  function handlePress() {
    // Micro-bounce on tap
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.93,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 10,
      }),
    ]).start();

    onToggle(item.key);
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handlePress}
        style={[styles.row, checked && styles.rowChecked]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={item.label}
        accessibilityHint={item.description}
      >
        {/* Left: icon badge */}
        <View style={[styles.iconBadge, checked && styles.iconBadgeChecked]}>
          <Text style={[styles.iconText, checked && styles.iconTextChecked]}>
            {item.icon}
          </Text>
        </View>

        {/* Centre: text */}
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, checked && styles.rowLabelChecked]}>
            {item.label}
          </Text>
          <Text style={styles.rowDescription} numberOfLines={1}>
            {item.description}
          </Text>
        </View>

        {/* Right: checkbox */}
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component: ProtocolChecklist
// ─────────────────────────────────────────────────────────────

interface ProtocolChecklistProps {
  state: ProtocolState;
  onChange: (updated: ProtocolState) => void;
}

export default function ProtocolChecklist({
  state,
  onChange,
}: ProtocolChecklistProps) {
  const checkedCount = Object.values(state).filter(Boolean).length;
  const total = CHECKLIST_ITEMS.length;
  const allDone = checkedCount === total;

  const handleToggle = useCallback(
    (key: keyof ProtocolState) => {
      onChange({ ...state, [key]: !state[key] });
    },
    [state, onChange]
  );

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Protocol Compliance</Text>
          <Text style={styles.subtitle}>
            All conditions required before submission
          </Text>
        </View>

        {/* Progress pill */}
        <View style={[styles.progressPill, allDone && styles.progressPillDone]}>
          <Text style={[styles.progressText, allDone && styles.progressTextDone]}>
            {checkedCount}/{total}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${(checkedCount / total) * 100}%` as any,
              backgroundColor: allDone ? GREEN : AMBER,
            },
          ]}
        />
      </View>

      {/* Checklist rows */}
      <View style={styles.list}>
        {CHECKLIST_ITEMS.map((item) => (
          <CheckRow
            key={item.key}
            item={item}
            checked={state[item.key]}
            onToggle={handleToggle}
          />
        ))}
      </View>

      {/* Status banner */}
      {allDone ? (
        <View style={styles.bannerSuccess}>
          <Text style={styles.bannerIcon}>✦</Text>
          <Text style={styles.bannerText}>
            All protocol conditions confirmed
          </Text>
        </View>
      ) : (
        <View style={styles.bannerWarning}>
          <Text style={styles.bannerIcon}>⚠</Text>
          <Text style={styles.bannerText}>
            {total - checkedCount} condition{total - checkedCount !== 1 ? 's' : ''} remaining
          </Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────

const GREEN = '#008236';
const GREEN_DIM = '#0D2B1A';
const GREEN_BORDER = '#1A4A2E';
const AMBER = '#B45309';
const AMBER_DIM = '#2B1F0D';
const AMBER_BORDER = '#4A3520';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161B22',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#21262D',
    padding: 16,
    gap: 12,
  },

  // ── Header ──────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  title: {
    color: '#E6EDF3',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  subtitle: {
    color: '#8B949E',
    fontSize: 11,
    marginTop: 2,
  },

  progressPill: {
    backgroundColor: AMBER_DIM,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AMBER_BORDER,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  progressPillDone: {
    backgroundColor: GREEN_DIM,
    borderColor: GREEN_BORDER,
  },

  progressText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  progressTextDone: {
    color: GREEN,
  },

  // ── Progress bar ─────────────────────────────────────────────
  progressTrack: {
    height: 3,
    backgroundColor: '#21262D',
    borderRadius: 999,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
  },

  // ── List ─────────────────────────────────────────────────────
  list: {
    gap: 8,
  },

  // ── Row ──────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0D1117',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#21262D',
    paddingVertical: 11,
    paddingHorizontal: 12,
  },

  rowChecked: {
    backgroundColor: GREEN_DIM,
    borderColor: GREEN_BORDER,
  },

  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#21262D',
    borderWidth: 1,
    borderColor: '#30363D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBadgeChecked: {
    backgroundColor: '#0D2B1A',
    borderColor: GREEN_BORDER,
  },

  iconText: {
    color: '#8B949E',
    fontSize: 16,
  },

  iconTextChecked: {
    color: GREEN,
  },

  rowContent: {
    flex: 1,
  },

  rowLabel: {
    color: '#C9D1D9',
    fontSize: 13,
    fontWeight: '600',
  },

  rowLabelChecked: {
    color: '#E6EDF3',
  },

  rowDescription: {
    color: '#8B949E',
    fontSize: 11,
    marginTop: 2,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#30363D',
    backgroundColor: '#21262D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Status banner ────────────────────────────────────────────
  bannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GREEN_DIM,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GREEN_BORDER,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },

  bannerWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AMBER_DIM,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AMBER_BORDER,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },

  bannerIcon: {
    color: '#E6EDF3',
    fontSize: 13,
  },

  bannerText: {
    color: '#E6EDF3',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
