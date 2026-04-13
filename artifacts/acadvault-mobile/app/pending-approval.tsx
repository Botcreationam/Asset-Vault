import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";

export default function PendingApprovalScreen() {
  const insets = useSafeAreaInsets();
  const { user, refetch, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const isRejected = user?.approvalStatus === "rejected";

  async function checkStatus() {
    setChecking(true);
    try {
      await refetch();
    } finally {
      setChecking(false);
    }
  }

  async function openWhatsApp() {
    await Linking.openURL("https://wa.me/260978277538");
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
    >
      {/* Logo */}
      <View style={styles.logoRow}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoIconText}>📚</Text>
        </View>
        <Text style={styles.logoText}>AcadVault</Text>
      </View>

      {isRejected ? (
        <View style={styles.card}>
          <Text style={styles.bigEmoji}>❌</Text>
          <Text style={styles.title}>Registration not approved</Text>
          <Text style={styles.desc}>
            Unfortunately, your registration could not be approved at this time.
          </Text>
          {user?.rejectionReason && (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>REASON</Text>
              <Text style={styles.reasonText}>{user.rejectionReason}</Text>
            </View>
          )}
          <Text style={styles.desc}>
            If you believe this is an error, please contact our support team.
          </Text>
          <TouchableOpacity style={[styles.btn, styles.btnGreen]} onPress={openWhatsApp}>
            <Text style={styles.btnText}>💬 Contact Support on WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.clockIcon}>
            <Text style={styles.clockEmoji}>⏳</Text>
          </View>
          <Text style={styles.title}>Account pending review</Text>
          <Text style={styles.desc}>
            Hi <Text style={styles.highlight}>{user?.nickname || user?.firstName || "there"}</Text>! Your registration is in the queue.
            An admin will review your details and approve your account shortly.
          </Text>

          <View style={styles.statusCard}>
            {user?.email && (
              <View style={styles.statusRow}>
                <Text style={styles.statusIcon}>✉️</Text>
                <View>
                  <Text style={styles.statusLabel}>EMAIL</Text>
                  <Text style={styles.statusValue}>{user.email}</Text>
                </View>
              </View>
            )}
            {user?.schoolId && (
              <View style={styles.statusRow}>
                <Text style={styles.statusIcon}>🏫</Text>
                <View>
                  <Text style={styles.statusLabel}>INSTITUTION</Text>
                  <Text style={styles.statusValue}>{user.schoolId}</Text>
                </View>
              </View>
            )}
            <View style={styles.statusRow}>
              <Text style={styles.statusIcon}>📋</Text>
              <View>
                <Text style={styles.statusLabel}>STATUS</Text>
                <View style={styles.statusPill}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusPillText}>Awaiting admin approval</Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.note}>
            You'll receive a confirmation email once your account is approved. This usually takes less than 24 hours.
          </Text>

          <TouchableOpacity
            style={[styles.btn, checking && styles.btnDisabled]}
            onPress={checkStatus}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator color="#0B1120" />
            ) : (
              <Text style={styles.btnText}>🔄 Check Approval Status</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportBtn} onPress={openWhatsApp}>
            <Text style={styles.supportBtnText}>💬 Contact Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1120" },
  content: { paddingHorizontal: 24, alignItems: "center" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 32 },
  logoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#142042", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  logoIconText: { fontSize: 20 },
  logoText: { fontSize: 22, fontWeight: "700", color: "#fff", fontFamily: "PlusJakartaSans_700Bold" },
  card: { width: "100%", backgroundColor: "#142042", borderRadius: 20, borderWidth: 1, borderColor: "rgba(217,160,20,0.2)", padding: 24, alignItems: "center", gap: 16 },
  bigEmoji: { fontSize: 48 },
  clockIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(217,160,20,0.1)", borderWidth: 1, borderColor: "rgba(217,160,20,0.2)", alignItems: "center", justifyContent: "center" },
  clockEmoji: { fontSize: 32 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", fontFamily: "PlusJakartaSans_700Bold", textAlign: "center" },
  desc: { fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 22, textAlign: "center", fontFamily: "PlusJakartaSans_400Regular" },
  highlight: { color: "#fff", fontWeight: "700" },
  reasonBox: { width: "100%", backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)", borderRadius: 12, padding: 14 },
  reasonLabel: { fontSize: 10, fontWeight: "700", color: "#fca5a5", letterSpacing: 1, marginBottom: 4, fontFamily: "PlusJakartaSans_700Bold" },
  reasonText: { fontSize: 14, color: "#e2e8f0", fontFamily: "PlusJakartaSans_400Regular", lineHeight: 20 },
  statusCard: { width: "100%", backgroundColor: "rgba(11,17,32,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 16, gap: 14 },
  statusRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  statusIcon: { fontSize: 20, lineHeight: 24 },
  statusLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.35)", letterSpacing: 1, fontFamily: "PlusJakartaSans_700Bold" },
  statusValue: { fontSize: 14, color: "rgba(255,255,255,0.75)", marginTop: 2, fontFamily: "PlusJakartaSans_400Regular" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#D9A014" },
  statusPillText: { fontSize: 13, color: "#D9A014", fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  note: { fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 18, fontFamily: "PlusJakartaSans_400Regular" },
  btn: { width: "100%", backgroundColor: "#D9A014", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  btnGreen: { backgroundColor: "#16a34a" },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 15, fontWeight: "700", color: "#0B1120", fontFamily: "PlusJakartaSans_700Bold" },
  supportBtn: { width: "100%", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  supportBtnText: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.6)", fontFamily: "PlusJakartaSans_600SemiBold" },
  logoutBtn: { paddingVertical: 8 },
  logoutBtnText: { fontSize: 13, color: "rgba(255,255,255,0.25)", fontFamily: "PlusJakartaSans_400Regular" },
});
