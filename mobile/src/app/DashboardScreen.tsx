import React, { useState } from "react";
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

// ─── Mock data — replace with your store/API ─────────────────────────────────

const MOCK_SESSION = {
  id: "1",
  name: "Spring Harvest 2026",
  batchId: "ALKA-2026-041",
  status: "Active",
  date: "May 15, 2026",
  samples: 24,
};

// FR-M1-10: Derive whether an active session exists from your sessions list.
// Replace this with a real selector from your store (e.g. useSelector, useContext, etc.)
const hasActiveSession = MOCK_SESSION.status === "Active";

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }: any) {
  const [search, setSearch] = useState("");

  return (
    <View style={styles.root}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require("../../assets/logo2.png")}
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
          onPress={() => navigation.navigate("Login")}
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
        {/* FR-M1-10: Active session warning — contextual hint above sessions list */}
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

        {/* SESSION CARD */}
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate("SessionProgress", {
              sessionId: MOCK_SESSION.id,
            })
          }
        >
          <View style={styles.cardTop}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{MOCK_SESSION.name}</Text>
              <Text style={styles.cardBatch}>{MOCK_SESSION.batchId}</Text>
            </View>

            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{MOCK_SESSION.status}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardBottom}>
            <Text style={styles.cardMeta}>📅 {MOCK_SESSION.date}</Text>
            <Text style={styles.cardMeta}>
              📊 {MOCK_SESSION.samples} samples
            </Text>
            <Text style={styles.cardChevron}>›</Text>
          </View>
        </TouchableOpacity>
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