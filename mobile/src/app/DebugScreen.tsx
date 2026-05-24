import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import db from "../db/database";

export default function DebugScreen() {
  const [users, setUsers] = useState<any[]>([]);

  async function fetchUsers() {
    const result = await db.getAllAsync(`SELECT * FROM users`);
    setUsers(result);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <ScrollView style={styles.root}>
      <Text style={styles.title}>SQLite — users table</Text>
      <TouchableOpacity style={styles.btn} onPress={fetchUsers}>
        <Text style={styles.btnText}>Refresh</Text>
      </TouchableOpacity>
      {users.length === 0 && (
        <Text style={styles.empty}>No users found.</Text>
      )}
      {users.map((u, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.row}>🪪 ID: {u.id}</Text>
          <Text style={styles.row}>👤 Name: {u.name}</Text>
          <Text style={styles.row}>📧 Email: {u.email}</Text>
          <Text style={styles.row}>🎭 Role: {u.role}</Text>
          <Text style={styles.row}>🏛 Institution: {u.institution}</Text>
          <Text style={styles.row}>📅 Created: {u.created_at}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F4F6", padding: 16, paddingTop: 60 },
  title: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 12 },
  btn: { backgroundColor: "#008236", padding: 10, borderRadius: 8, marginBottom: 16, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  empty: { color: "#6B7280", textAlign: "center", marginTop: 40 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  row: { fontSize: 13, color: "#374151", marginBottom: 4 },
});