import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/contexts/ApiContext";

export default function AccountScreen() {
  const colors = useColors();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const { apiFetch } = useApi();
  const isWeb = Platform.OS === "web";

  const { data: txData } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await apiFetch("/api/units/transactions");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const transactions = txData?.transactions || [];

  if (isLoading) {
    return (
      <View style={[styles.authContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.authContainer, { backgroundColor: colors.background, paddingTop: isWeb ? 67 : 0 }]}>
        <Ionicons name="person-circle" size={64} color={colors.primary} style={{ opacity: 0.5 }} />
        <Text style={[styles.authTitle, { color: colors.foreground }]}>Your Account</Text>
        <Text style={[styles.authMessage, { color: colors.mutedForeground }]}>
          Sign in to view your profile and balance
        </Text>
        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: colors.primary }]}
          onPress={login}
          activeOpacity={0.8}
        >
          <Text style={[styles.loginText, { color: colors.primaryForeground }]}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: isWeb ? 67 : 0, paddingBottom: isWeb ? 84 : 100 }]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Account</Text>

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {user?.profileImageUrl ? (
          <Image source={{ uri: user.profileImageUrl }} style={styles.profileImage} />
        ) : (
          <View style={[styles.profilePlaceholder, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="person" size={32} color={colors.primary} />
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>
            {user?.firstName || user?.username || "Student"}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: user?.role === "admin" ? colors.accent + "20" : colors.secondary }]}>
            <Text style={[styles.roleText, { color: user?.role === "admin" ? colors.accent : colors.secondaryForeground }]}>
              {user?.role === "admin" ? "Admin" : "Student"}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
        <View style={styles.balanceHeader}>
          <Ionicons name="flash" size={24} color={colors.accent} />
          <Text style={[styles.balanceLabel, { color: colors.primaryForeground + "CC" }]}>Unit Balance</Text>
        </View>
        <Text style={[styles.balanceAmount, { color: colors.primaryForeground }]}>
          {user?.unitsBalance ?? 0}
        </Text>
        <Text style={[styles.balanceSub, { color: colors.primaryForeground + "80" }]}>
          units available for downloads
        </Text>
      </View>

      {transactions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Transactions</Text>
          {transactions.slice(0, 10).map((tx: any) => (
            <View
              key={tx.id}
              style={[styles.txRow, { borderBottomColor: colors.border }]}
            >
              <View style={[
                styles.txIcon,
                { backgroundColor: tx.type === "credit" ? "#22C55E20" : "#EF444420" },
              ]}>
                <Ionicons
                  name={tx.type === "credit" ? "arrow-down" : "arrow-up"}
                  size={16}
                  color={tx.type === "credit" ? "#22C55E" : "#EF4444"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txDesc, { color: colors.foreground }]} numberOfLines={1}>
                  {tx.description}
                </Text>
                <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
                  {new Date(tx.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  { color: tx.type === "credit" ? "#22C55E" : "#EF4444" },
                ]}
              >
                {tx.type === "credit" ? "+" : "-"}{tx.amount}
              </Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.logoutButton, { borderColor: colors.destructive }]}
        onPress={logout}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out" size={18} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  authContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  authTitle: { fontSize: 24, fontFamily: "PlusJakartaSans_700Bold", marginTop: 12 },
  authMessage: { fontSize: 15, textAlign: "center" },
  loginButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  loginText: { fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
  content: { padding: 20 },
  title: {
    fontSize: 28,
    fontFamily: "PlusJakartaSans_700Bold",
    marginBottom: 20,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 14,
  },
  profileImage: { width: 56, height: 56, borderRadius: 28 },
  profilePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1, gap: 6 },
  profileName: { fontSize: 18, fontFamily: "PlusJakartaSans_700Bold" },
  roleBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  roleText: { fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold" },
  balanceCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  balanceHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  balanceLabel: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium" },
  balanceAmount: { fontSize: 42, fontFamily: "PlusJakartaSans_700Bold" },
  balanceSub: { fontSize: 13, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans_600SemiBold",
    marginBottom: 12,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  txDesc: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium" },
  txDate: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 16, fontFamily: "PlusJakartaSans_700Bold" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  logoutText: { fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
});
