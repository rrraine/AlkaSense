import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllSessions, getActiveSession, deleteSession } from '../services/SessionService';
import type { Session } from '../db/repositories/SessionRepository';

const GREEN = '#008236';
const GREEN_DARK = '#006228';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        setLoading(true);
        try {
          const [all, active] = await Promise.all([
            getAllSessions(),
            getActiveSession(),
          ]);
          if (!cancelled) {
            setSessions(all);
            setHasActiveSession(active !== null);
          }
        } catch (err) {
          console.error('DashboardScreen load error:', err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      load();
      return () => { cancelled = true; };
    }, [])
  );

  const filteredSessions = sessions.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.batch_identifier.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.root}>

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/logo2.png')}
            style={styles.logo}
          />
          <View>
            <Text style={styles.headerTitle}>AlkaSense</Text>
            <Text style={styles.headerSubtitle}>
              AI-Assisted Rice Grain Evaluation
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search sessions..."
          placeholderTextColor="rgba(255,255,255,0.7)"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* FR-M1-10: Active session warning banner */}
        {hasActiveSession && (
          <View style={styles.activeSessionBanner}>
            <Text style={styles.activeSessionBannerText}>
              You have an active session. Close it before creating a new one.
            </Text>
          </View>
        )}

        {/* SESSION LIST */}
        {loading ? (
          <ActivityIndicator
            color={GREEN}
            size="large"
            style={{ marginTop: 32 }}
          />
        ) : filteredSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {search.trim()
                ? 'No sessions match your search.'
                : 'No sessions yet. Create your first session below.'}
            </Text>
          </View>
        ) : (
          filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onPress={() =>
                navigation.navigate('SessionProgress', {
                  sessionId: session.id,
                })
              }
              onDelete={session.status === 'Completed' ? () => {
                Alert.alert(
                  'Delete Session',
                  `Delete "${session.name}" and all its records? This cannot be undone.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await deleteSession(session.id);
                          setSessions((prev) => prev.filter((s) => s.id !== session.id));
                        } catch (err: any) {
                          Alert.alert('Error', err?.message ?? 'Failed to delete session.');
                        }
                      },
                    },
                  ]
                );
              } : undefined}
            />
          ))
        )}
      </ScrollView>

      {/* CREATE NEW SESSION BUTTON */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createBtn,
            hasActiveSession && styles.createBtnDisabled,
          ]}
          disabled={hasActiveSession || loading}
          onPress={() => navigation.navigate('CreateSession')}
          activeOpacity={hasActiveSession ? 1 : 0.85}
        >
          <Text style={styles.createBtnText}>+ Create New Session</Text>
        </TouchableOpacity>

        {hasActiveSession && (
          <Text style={styles.createBtnHint}>
            Close the current active session to create a new one.
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Session card sub-component ───────────────────────────────────────────────

function SessionCard({
  session,
  onPress,
  onDelete,
}: {
  session: Session;
  onPress: () => void;
  onDelete?: () => void;
}) {
  const isActive = session.status === 'Active';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{session.name}</Text>
          <Text style={styles.cardBatch}>{session.batch_identifier}</Text>
        </View>

        <View style={[styles.badge, isActive ? styles.activeBadge : styles.completedBadge]}>
          <Text style={[styles.badgeText, isActive ? styles.activeBadgeText : styles.completedBadgeText]}>
            {session.status}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardBottom}>
        <Text style={styles.cardMeta}>{formatDate(session.evaluation_date)}</Text>
        <View style={styles.cardBottomRight}>
          {onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.cardChevron}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    backgroundColor: GREEN,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logo: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
    borderRadius: 14,
    marginRight: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  searchWrapper: {
    backgroundColor: GREEN,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 17,
    paddingVertical: 14,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },

  activeSessionBanner: {
    backgroundColor: '#FFF8E8',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  activeSessionBannerText: { fontSize: 13, color: '#92400E', fontWeight: '500' },

  libraryBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  libraryText: { fontSize: 14, fontWeight: '600', color: '#1D4ED8' },

  emptyState: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardInfo: { flex: 1, marginRight: 12 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardBatch: { fontSize: 13, color: '#6B7280' },

  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  activeBadge: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  completedBadge: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  activeBadgeText: { color: '#15803D' },
  completedBadgeText: { color: '#6B7280' },

  cardDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 12 },
  cardBottom: { flexDirection: 'row', alignItems: 'center' },
  cardMeta: { fontSize: 13, color: '#6B7280', flex: 1 },
  cardChevron: { fontSize: 20, color: '#9CA3AF', fontWeight: '300' },

  cardBottomRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  createBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createBtnDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.7,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  createBtnHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});