import React, { useCallback, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../../core/firebase";
import { useFocusEffect } from "@react-navigation/native";
import { getAllSessions } from "../services/SessionService";
import { SessionRecord } from "../../../shared/types/session.types";
import { useAuthContext } from "../../../core/AuthContext";
import { useSessionStore } from "../../../store/sessionStore";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";

const GREEN = "#008236";
const GREEN_DARK = "#006228";

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuthContext();
  const restoreActiveSession = useSessionStore((s) => s.restoreActiveSession);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [search, setSearch] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) return;
      getAllSessions(user.uid).then(setSessions).catch(() => {});
      restoreActiveSession(user.uid);
    }, [user?.uid])
  );

  const hasActiveSession = sessions.some((s) => s.status === "ACTIVE");

  const filtered = sessions.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.batch_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require("../../../../assets/logo2.png")}
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
          onPress={() => signOut(auth).catch(() => {})}
        >
          <Text style={styles.logoutText}>⇥ Logout</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search sessions..."
          placeholderTextColor="#f0f3f9"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* FR-M1-10: Active session warning */}
        {hasActiveSession && (
          <View style={styles.activeSessionBanner}>
            <Text style={styles.activeSessionBannerText}>
              ⚠ You have an active session. Close it before creating a new one.
            </Text>
          </View>
        )}

        {/* ASV REFERENCE LIBRARY */}
        <TouchableOpacity
          style={styles.libraryBtn}
          onPress={() => navigation.navigate("ReferenceLibrary")}
        >
          <Text style={styles.libraryText}>📖 ASV Reference Library</Text>
        </TouchableOpacity>

        {/* EMPTY STATE */}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No sessions yet. Tap below to create one.
            </Text>
          </View>
        )}

        {/* SESSION CARDS */}
        {filtered.map((session) => (
          <TouchableOpacity
            key={session.id}
            style={styles.card}
            onPress={() =>
              navigation.navigate("SessionProgress", { sessionId: session.id })
            }
          >
            <View style={styles.cardTop}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{session.name}</Text>
                <Text style={styles.cardBatch}>{session.batch_id}</Text>
              </View>

              <View
                style={
                  session.status === "ACTIVE"
                    ? styles.activeBadge
                    : styles.closedBadge
                }
              >
                <Text
                  style={
                    session.status === "ACTIVE"
                      ? styles.activeBadgeText
                      : styles.closedBadgeText
                  }
                >
                  {session.status === "ACTIVE" ? "Active" : "Closed"}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardBottom}>
              <Text style={styles.cardMeta}>
                📅{" "}
                {new Date(session.evaluation_date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
              <Text style={styles.cardChevron}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* CREATE NEW SESSION BUTTON — FR-M1-10: disabled when active session exists */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createBtn,
            hasActiveSession && styles.createBtnDisabled,
          ]}
          disabled={hasActiveSession}
          onPress={() => navigation.navigate("CreateSession")}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F4F6" },

  // HEADER
  header: {
    backgroundColor: GREEN,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  logo: { width: 52, height: 52, resizeMode: "contain", borderRadius: 14, marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  headerSubtitle: { fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 },

  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoutText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  // SEARCH
  searchWrapper: { backgroundColor: GREEN, paddingHorizontal: 16, paddingBottom: 16 },
  searchInput: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 17,
    paddingVertical: 17,
    fontSize: 14,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },

  // Active session banner
  activeSessionBanner: {
    backgroundColor: "#FFF8E8",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  activeSessionBannerText: { fontSize: 13, color: "#92400E", fontWeight: "500" },

  // EMPTY STATE
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },

  // ASV LIBRARY BUTTON
  libraryBtn: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  libraryText: { fontSize: 14, fontWeight: "600", color: "#1D4ED8" },

  // SESSION CARD
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardInfo: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  cardBatch: { fontSize: 13, color: "#6B7280" },
  activeBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  activeBadgeText: { fontSize: 12, fontWeight: "600", color: "#15803D" },
  closedBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  closedBadgeText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  cardDivider: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 12 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardMeta: { fontSize: 13, color: "#6B7280", flex: 1 },
  cardChevron: { fontSize: 20, color: "#9CA3AF", fontWeight: "300" },

  // FOOTER
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#F3F4F6",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  createBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createBtnDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.7,
  },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  createBtnHint: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },
});
