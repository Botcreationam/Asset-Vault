import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/contexts/ApiContext";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

const TYPE_ICONS: Record<string, string> = {
  pdf: "document-text",
  slides: "easel",
  book: "book",
  notes: "create",
  video: "videocam",
  other: "document",
};

const TYPE_COLORS: Record<string, string> = {
  pdf: "#EF4444",
  slides: "#F97316",
  book: "#3B82F6",
  notes: "#22C55E",
  video: "#A855F7",
  other: "#6B7280",
};

function formatBytes(bytes?: number) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function StatPill({ icon, label, colors }: { icon: string; label: string; colors: any }) {
  return (
    <View style={[styles.statPill, { backgroundColor: colors.muted }]}>
      <Ionicons name={icon as any} size={13} color={colors.mutedForeground} />
      <Text style={[styles.statText, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function ResourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { user, refetch: refetchAuth } = useAuth();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const { data: resource, isLoading } = useQuery({
    queryKey: ["resource", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/resources/${id}`);
      return res.json();
    },
    enabled: !!id,
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/resources/${id}/download`, { method: "POST" });
      return res.json();
    },
    onSuccess: async (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchAuth();
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await WebBrowser.openBrowserAsync(data.url);
    },
    onError: (err: Error) => {
      Alert.alert("Download Failed", err.message);
    },
  });

  const handleView = async () => {
    try {
      const res = await apiFetch(`/api/resources/${id}/view`);
      const data = await res.json();
      await WebBrowser.openBrowserAsync(data.url);
    } catch {
      Alert.alert("Error", "Could not open the viewer. Please try again.");
    }
  };

  const handleDownload = () => {
    if (!resource) return;
    const isTrial = user?.isTrialActive;
    const balance = user?.unitsBalance ?? 0;

    if (isTrial) {
      Alert.alert(
        "Free Trial Download",
        `Download "${resource.name}" for free — your trial is active!`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Download Free", onPress: () => downloadMutation.mutate() },
        ]
      );
      return;
    }

    if (balance < resource.downloadCost) {
      Alert.alert(
        "Not Enough Units",
        `You need ${resource.downloadCost} units but only have ${balance}. Contact an admin to top up your balance.`
      );
      return;
    }

    Alert.alert(
      "Confirm Download",
      `Download "${resource.name}" for ${resource.downloadCost} units?\n\nBalance after: ${balance - resource.downloadCost} units.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Download", onPress: () => downloadMutation.mutate() },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!resource) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={52} color={colors.mutedForeground} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Resource not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backLink, { backgroundColor: colors.muted }]}>
          <Ionicons name="arrow-back" size={16} color={colors.primary} />
          <Text style={[styles.backLinkText, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeColor = TYPE_COLORS[resource.type] || TYPE_COLORS.other;
  const iconName = TYPE_ICONS[resource.type] || TYPE_ICONS.other;
  const isTrial = user?.isTrialActive;
  const canAfford = isTrial || (user?.unitsBalance ?? 0) >= resource.downloadCost;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: 110 }]}
    >
      {/* ── Type hero strip ──────────────────────────────────────────── */}
      <LinearGradient
        colors={[typeColor + "30", typeColor + "08"]}
        style={styles.typeHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.typeIconCircle, { backgroundColor: typeColor + "25" }]}>
          <Ionicons name={iconName as any} size={32} color={typeColor} />
        </View>
        <View style={[styles.typeBadge, { backgroundColor: typeColor + "25" }]}>
          <Text style={[styles.typeBadgeText, { color: typeColor }]}>{resource.type?.toUpperCase()}</Text>
        </View>
        <Text style={[styles.resourceName, { color: colors.foreground }]}>{resource.name}</Text>

        {resource.description ? (
          <Text style={[styles.description, { color: colors.mutedForeground }]}>{resource.description}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <StatPill icon="eye" label={`${resource.viewCount ?? 0} views`} colors={colors} />
          <StatPill icon="download" label={`${resource.downloadCount ?? 0} downloads`} colors={colors} />
          {formatBytes(resource.fileSize) ? (
            <StatPill icon="server" label={formatBytes(resource.fileSize)!} colors={colors} />
          ) : null}
        </View>
      </LinearGradient>

      {/* ── Cost / Trial card ────────────────────────────────────────── */}
      {isTrial ? (
        <View style={[styles.costCard, { backgroundColor: "#78350F18", borderColor: "#D97706" }]}>
          <View style={styles.costRow}>
            <View style={styles.costLeft}>
              <Ionicons name="gift" size={20} color="#D97706" />
              <View>
                <Text style={[styles.costLabel, { color: "#D97706" }]}>Trial Download</Text>
                <Text style={[styles.costSub, { color: colors.mutedForeground }]}>Free during your trial period</Text>
              </View>
            </View>
            <Text style={[styles.costFree, { color: "#D97706" }]}>FREE</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.costCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.costRow}>
            <View style={styles.costLeft}>
              <Ionicons name="flash" size={20} color={colors.accent} />
              <View>
                <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>Download Cost</Text>
                <Text style={[styles.costSub, { color: colors.mutedForeground }]}>
                  Your balance: {user?.unitsBalance ?? 0} units
                </Text>
              </View>
            </View>
            <View style={styles.costAmount}>
              <Text style={[styles.costValue, { color: colors.accent }]}>{resource.downloadCost}</Text>
              <Text style={[styles.costUnit, { color: colors.mutedForeground }]}>units</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.viewBtn, { borderColor: colors.primary }]}
          onPress={handleView}
          activeOpacity={0.75}
        >
          <Ionicons name="eye" size={20} color={colors.primary} />
          <Text style={[styles.viewBtnText, { color: colors.primary }]}>View Free</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.downloadBtn,
            isTrial
              ? { backgroundColor: "#D97706" }
              : canAfford
              ? { backgroundColor: "#142042" }
              : { backgroundColor: colors.muted },
          ]}
          onPress={handleDownload}
          disabled={downloadMutation.isPending}
          activeOpacity={0.8}
        >
          {downloadMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name={isTrial ? "gift" : "download"}
                size={20}
                color={canAfford ? "#fff" : colors.mutedForeground}
              />
              <Text style={[styles.downloadBtnText, { color: canAfford ? "#fff" : colors.mutedForeground }]}>
                {isTrial ? "Download Free" : "Download"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {!canAfford && !isTrial && (
        <View style={[styles.insufficientBox, { backgroundColor: "#EF444415", borderColor: "#EF4444" }]}>
          <Ionicons name="warning" size={16} color="#EF4444" />
          <Text style={[styles.insufficientText, { color: "#EF4444" }]}>
            You need {resource.downloadCost - (user?.unitsBalance ?? 0)} more units. Ask an admin to top up your balance.
          </Text>
        </View>
      )}

      {/* ── Security note ─────────────────────────────────────────────── */}
      <View style={[styles.securityNote, { backgroundColor: colors.muted }]}>
        <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
        <Text style={[styles.securityText, { color: colors.mutedForeground }]}>
          Reading is always free and secure. Downloads are watermarked for copyright protection.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 32 },
  errorTitle: { fontSize: 18, fontFamily: "PlusJakartaSans_600SemiBold" },
  backLink: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  backLinkText: { fontSize: 15, fontFamily: "PlusJakartaSans_500Medium" },
  // Type hero
  typeHero: {
    borderRadius: 18, padding: 20, gap: 10,
  },
  typeIconCircle: {
    width: 60, height: 60, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6,
  },
  typeBadgeText: { fontSize: 11, fontFamily: "PlusJakartaSans_700Bold", letterSpacing: 0.5 },
  resourceName: { fontSize: 22, fontFamily: "PlusJakartaSans_700Bold", lineHeight: 28 },
  description: { fontSize: 14, lineHeight: 21 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  statPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statText: { fontSize: 12 },
  // Cost card
  costCard: { borderWidth: 1, borderRadius: 14, padding: 16 },
  costRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  costLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  costLabel: { fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold" },
  costSub: { fontSize: 12, marginTop: 2 },
  costAmount: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  costValue: { fontSize: 32, fontFamily: "PlusJakartaSans_700Bold" },
  costUnit: { fontSize: 14 },
  costFree: { fontSize: 28, fontFamily: "PlusJakartaSans_700Bold" },
  // Action buttons
  actionsRow: { flexDirection: "row", gap: 12 },
  viewBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
  },
  viewBtnText: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold" },
  downloadBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  downloadBtnText: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold" },
  // Insufficient
  insufficientBox: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 10, padding: 12, borderRadius: 12, borderWidth: 1,
  },
  insufficientText: { flex: 1, fontSize: 13, lineHeight: 18 },
  // Security
  securityNote: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 10, padding: 14, borderRadius: 12,
  },
  securityText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
