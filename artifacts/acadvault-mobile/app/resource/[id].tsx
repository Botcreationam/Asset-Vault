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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/contexts/ApiContext";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

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

export default function ResourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { user, refetch: refetchAuth } = useAuth();
  const { apiFetch, baseUrl } = useApi();
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const isWeb = Platform.OS === "web";

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
      Alert.alert("Download failed", err.message);
    },
  });

  const handleView = async () => {
    try {
      const res = await apiFetch(`/api/resources/${id}/view`);
      const data = await res.json();
      await WebBrowser.openBrowserAsync(data.url);
    } catch {
      Alert.alert("Error", "Could not open viewer");
    }
  };

  const handleDownload = () => {
    if (!resource) return;
    const balance = user?.unitsBalance ?? 0;
    if (balance < resource.downloadCost) {
      Alert.alert(
        "Not enough units",
        `You need ${resource.downloadCost} units but have ${balance}. Ask an admin to top up your balance.`
      );
      return;
    }
    Alert.alert(
      "Confirm Download",
      `This will cost ${resource.downloadCost} units. Your balance after: ${balance - resource.downloadCost} units.`,
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
        <Ionicons name="alert-circle" size={48} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>Resource not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeColor = TYPE_COLORS[resource.type] || TYPE_COLORS.other;
  const canAfford = (user?.unitsBalance ?? 0) >= resource.downloadCost;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.typeStrip, { backgroundColor: typeColor }]} />

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.typeBadge, { backgroundColor: typeColor + "20" }]}>
          <Text style={[styles.typeText, { color: typeColor }]}>
            {resource.type?.toUpperCase()}
          </Text>
        </View>

        <Text style={[styles.resourceName, { color: colors.foreground }]}>{resource.name}</Text>

        {resource.description ? (
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {resource.description}
          </Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="eye" size={16} color={colors.mutedForeground} />
            <Text style={[styles.statText, { color: colors.mutedForeground }]}>
              {resource.viewCount ?? 0} views
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="download" size={16} color={colors.mutedForeground} />
            <Text style={[styles.statText, { color: colors.mutedForeground }]}>
              {resource.downloadCount ?? 0} downloads
            </Text>
          </View>
          {formatBytes(resource.fileSize) ? (
            <View style={styles.stat}>
              <Ionicons name="server" size={16} color={colors.mutedForeground} />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>
                {formatBytes(resource.fileSize)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.costCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.costRow}>
          <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>Download Cost</Text>
          <View style={styles.costAmount}>
            <Ionicons name="flash" size={20} color={colors.accent} />
            <Text style={[styles.costValue, { color: colors.accent }]}>
              {resource.downloadCost}
            </Text>
            <Text style={[styles.costUnit, { color: colors.mutedForeground }]}>units</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.viewButton, { borderColor: colors.primary }]}
          onPress={handleView}
          activeOpacity={0.7}
        >
          <Ionicons name="eye" size={20} color={colors.primary} />
          <Text style={[styles.viewButtonText, { color: colors.primary }]}>View Free</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.downloadButton,
            { backgroundColor: canAfford ? colors.primary : colors.muted },
          ]}
          onPress={handleDownload}
          disabled={downloading || downloadMutation.isPending}
          activeOpacity={0.7}
        >
          {downloadMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <Ionicons
                name="download"
                size={20}
                color={canAfford ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.downloadButtonText,
                  { color: canAfford ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                Download
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {!canAfford && (
        <Text style={[styles.insufficientText, { color: colors.destructive }]}>
          You need {resource.downloadCost - (user?.unitsBalance ?? 0)} more units
        </Text>
      )}

      <View style={[styles.securityNote, { backgroundColor: colors.muted }]}>
        <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
        <Text style={[styles.securityText, { color: colors.mutedForeground }]}>
          Reading is free and secure. Downloads require units and are watermarked.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 18, fontFamily: "PlusJakartaSans_600SemiBold" },
  typeStrip: { height: 4, borderRadius: 2, marginBottom: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  typeText: { fontSize: 11, fontFamily: "PlusJakartaSans_700Bold", letterSpacing: 0.5 },
  resourceName: { fontSize: 22, fontFamily: "PlusJakartaSans_700Bold", lineHeight: 28 },
  description: { fontSize: 15, lineHeight: 22, marginTop: 8 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 16 },
  stat: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: { fontSize: 13 },
  costCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  costRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  costLabel: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium" },
  costAmount: { flexDirection: "row", alignItems: "center", gap: 4 },
  costValue: { fontSize: 28, fontFamily: "PlusJakartaSans_700Bold" },
  costUnit: { fontSize: 14 },
  actions: { flexDirection: "row", gap: 12, marginBottom: 12 },
  viewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  viewButtonText: { fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
  downloadButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  downloadButtonText: { fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
  insufficientText: { fontSize: 13, textAlign: "center", marginBottom: 16 },
  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  securityText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
