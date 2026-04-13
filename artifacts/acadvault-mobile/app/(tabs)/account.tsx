import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/contexts/ApiContext";

const isWeb = Platform.OS === "web";

function InfoRow({ icon, label, value, colors }: { icon: string; label: string; value?: string | null; colors: any }) {
  if (!value) return null;
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Ionicons name={icon as any} size={16} color={colors.mutedForeground} />
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function AccountScreen() {
  const colors = useColors();
  const { user, isAuthenticated, isLoading, login, logout, refetch: refetchAuth } = useAuth();
  const { apiFetch } = useApi();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: txData, refetch: refetchTx } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await apiFetch("/api/units/transactions");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchAuth(), refetchTx()]);
    setRefreshing(false);
  };

  const transactions = txData?.transactions || [];

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="person-circle" size={64} color={colors.primary} style={{ opacity: 0.4 }} />
        <Text style={[styles.authTitle, { color: colors.foreground }]}>Your Account</Text>
        <Text style={[styles.authMessage, { color: colors.mutedForeground }]}>
          Sign in to view your profile, balance, and downloads
        </Text>
        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: colors.primary }]}
          onPress={login}
          activeOpacity={0.85}
        >
          <Ionicons name="log-in" size={18} color="#fff" />
          <Text style={styles.loginText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = user?.nickname || user?.firstName || user?.username || "Student";
  const roleLabel = user?.role === "admin" ? "Admin" : user?.role === "moderator" ? "Moderator" : "Student";
  const roleColor = user?.role === "admin" ? "#D9A014" : user?.role === "moderator" ? "#8B5CF6" : "#22C55E";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: isWeb ? 67 : insets.top + 8, paddingBottom: 110 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* ── Profile hero card ──────────────────────────────────────────── */}
      <LinearGradient
        colors={["#142042", "#1e3a6e"]}
        style={styles.profileHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroInner}>
          {user?.profileImageUrl ? (
            <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{displayName[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName} numberOfLines={1}>{displayName}</Text>
            {user?.username && user?.nickname && (
              <Text style={styles.heroUsername}>@{user.username}</Text>
            )}
            <View style={[styles.rolePill, { backgroundColor: roleColor + "25" }]}>
              <Text style={[styles.roleText, { color: roleColor }]}>{roleLabel}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ── Trial status card ──────────────────────────────────────────── */}
      {user?.isTrialActive ? (
        <View style={[styles.trialCard, { backgroundColor: "#78350F18", borderColor: "#D97706" }]}>
          <View style={styles.trialHeader}>
            <Ionicons name="gift" size={20} color="#D97706" />
            <Text style={[styles.trialTitle, { color: "#D97706" }]}>Free Trial Active</Text>
            <View style={[styles.trialBadge]}>
              <Text style={styles.trialBadgeText}>{user.trialDaysRemaining}d left</Text>
            </View>
          </View>
          <Text style={[styles.trialSub, { color: colors.mutedForeground }]}>
            All downloads are free until {new Date(user.trialEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        </View>
      ) : user && !user.isTrialActive && user.trialDaysRemaining === 0 ? (
        <View style={[styles.trialCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <View style={styles.trialHeader}>
            <Ionicons name="time" size={18} color={colors.mutedForeground} />
            <Text style={[styles.trialTitle, { color: colors.mutedForeground }]}>Trial Ended</Text>
          </View>
          <Text style={[styles.trialSub, { color: colors.mutedForeground }]}>
            Purchase units to continue downloading resources.
          </Text>
        </View>
      ) : null}

      {/* ── Units balance ──────────────────────────────────────────────── */}
      <View style={[styles.balanceCard, { backgroundColor: "#142042" }]}>
        <View style={styles.balanceTop}>
          <View>
            <Text style={styles.balanceLabel}>Unit Balance</Text>
            <Text style={styles.balanceAmount}>{user?.unitsBalance ?? 0}</Text>
          </View>
          <View style={styles.balanceIcon}>
            <Ionicons name="flash" size={28} color="#D9A014" />
          </View>
        </View>
        <Text style={styles.balanceSub}>units available for downloads</Text>
      </View>

      {/* ── Academic profile ───────────────────────────────────────────── */}
      {(user?.program || user?.academicYear || user?.semester) && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Academic Profile</Text>
          <InfoRow icon="school" label="Program" value={user.program} colors={colors} />
          <InfoRow icon="calendar" label="Year" value={user.academicYear} colors={colors} />
          <InfoRow icon="bookmark" label="Semester" value={user.semester} colors={colors} />
        </View>
      )}

      {/* ── Transaction history ────────────────────────────────────────── */}
      {transactions.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Transaction History</Text>
          {transactions.slice(0, 15).map((tx: any) => (
            <View key={tx.id} style={[styles.txRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.txIcon, {
                backgroundColor: tx.type === "credit" ? "#22C55E20" : "#EF444420",
              }]}>
                <Ionicons
                  name={tx.type === "credit" ? "arrow-down" : "arrow-up"}
                  size={15}
                  color={tx.type === "credit" ? "#22C55E" : "#EF4444"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txDesc, { color: colors.foreground }]} numberOfLines={2}>
                  {tx.description}
                </Text>
                <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
                  {new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === "credit" ? "#22C55E" : "#EF4444" }]}>
                {tx.type === "credit" ? "+" : "-"}{tx.amount}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Sign out ───────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.logoutButton, { borderColor: colors.destructive }]}
        onPress={logout}
        activeOpacity={0.75}
      >
        <Ionicons name="log-out" size={18} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 40 },
  authTitle: { fontSize: 24, fontFamily: "PlusJakartaSans_700Bold" },
  authMessage: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  loginButton: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14, marginTop: 6,
  },
  loginText: { color: "#fff", fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
  content: { padding: 16, gap: 14 },
  // Profile hero
  profileHero: {
    borderRadius: 18,
    overflow: "hidden",
  },
  heroInner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" },
  avatarPlaceholder: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { color: "#fff", fontSize: 26, fontFamily: "PlusJakartaSans_700Bold" },
  heroName: { color: "#fff", fontSize: 20, fontFamily: "PlusJakartaSans_700Bold" },
  heroUsername: { color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 2 },
  rolePill: {
    alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginTop: 8,
  },
  roleText: { fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold" },
  // Trial
  trialCard: {
    borderWidth: 1, borderRadius: 14, padding: 16, gap: 6,
  },
  trialHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  trialTitle: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold", flex: 1 },
  trialBadge: {
    backgroundColor: "#D97706",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  trialBadgeText: { color: "#fff", fontSize: 11, fontFamily: "PlusJakartaSans_700Bold" },
  trialSub: { fontSize: 13, lineHeight: 18 },
  // Balance
  balanceCard: { borderRadius: 16, padding: 20, gap: 4 },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  balanceLabel: { color: "rgba(255,255,255,0.6)", fontSize: 13 },
  balanceAmount: { color: "#fff", fontSize: 44, fontFamily: "PlusJakartaSans_700Bold", lineHeight: 50 },
  balanceIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "rgba(217,160,20,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  balanceSub: { color: "rgba(255,255,255,0.45)", fontSize: 12 },
  // Generic card
  card: { borderRadius: 14, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold", marginBottom: 12 },
  // Academic info rows
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: { fontSize: 13, width: 68 },
  infoValue: { flex: 1, fontSize: 14, fontFamily: "PlusJakartaSans_500Medium" },
  // Transactions
  txRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  txDesc: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium" },
  txDate: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  // Logout
  logoutButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5,
  },
  logoutText: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold" },
});
