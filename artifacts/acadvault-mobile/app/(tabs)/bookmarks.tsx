import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/contexts/ApiContext";
import { EmptyState } from "@/components/EmptyState";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

const isWeb = Platform.OS === "web";

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

export default function BookmarksScreen() {
  const colors = useColors();
  const { isAuthenticated, isLoading, login } = useAuth();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading: bmLoading, refetch } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      const res = await apiFetch("/api/bookmarks");
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const removeMut = useMutation({
    mutationFn: async (resourceId: number) => {
      const res = await apiFetch(`/api/bookmarks/${resourceId}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const bookmarks = data?.bookmarks || [];

  if (isLoading) {
    return <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="bookmark" size={56} color={colors.primary} style={{ opacity: 0.5 }} />
        <Text style={[styles.authTitle, { color: colors.foreground }]}>Saved Resources</Text>
        <Text style={[styles.authMessage, { color: colors.mutedForeground }]}>Sign in to view your bookmarked resources</Text>
        <TouchableOpacity style={[styles.loginButton, { backgroundColor: colors.primary }]} onPress={login} activeOpacity={0.85}>
          <Ionicons name="log-in" size={18} color="#fff" />
          <Text style={styles.loginText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: colors.background }]}
      data={bookmarks}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 84 : 110 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View style={{ paddingTop: isWeb ? 67 : insets.top + 8 }}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Saved Resources</Text>
          <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
            {bookmarks.length} bookmark{bookmarks.length !== 1 ? "s" : ""}
          </Text>
        </View>
      }
      ListEmptyComponent={
        bmLoading
          ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
          : <EmptyState
              icon="bookmark-outline"
              title="No bookmarks yet"
              message="Tap the bookmark icon on any resource to save it here"
            />
      }
      renderItem={({ item }) => {
        const resource = item.resource || item;
        const typeColor = TYPE_COLORS[resource.type] || TYPE_COLORS.other;
        const iconName = TYPE_ICONS[resource.type] || TYPE_ICONS.other;

        return (
          <TouchableOpacity
            style={[styles.bookmarkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/resource/${resource.id}`)}
            activeOpacity={0.78}
          >
            <View style={[styles.typeIcon, { backgroundColor: typeColor + "20" }]}>
              <Ionicons name={iconName as any} size={22} color={typeColor} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.resourceName, { color: colors.foreground }]} numberOfLines={2}>{resource.name}</Text>
              <View style={styles.resourceMeta}>
                <View style={[styles.typeBadge, { backgroundColor: typeColor + "18" }]}>
                  <Text style={[styles.typeBadgeText, { color: typeColor }]}>{resource.type?.toUpperCase()}</Text>
                </View>
                {resource.downloadCost != null && (
                  <View style={styles.costBadge}>
                    <Ionicons name="flash" size={11} color={colors.accent} />
                    <Text style={[styles.costText, { color: colors.accent }]}>{resource.downloadCost}</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.removeBtn, { backgroundColor: "#EF444415" }]}
              onPress={() => removeMut.mutate(resource.id)}
              disabled={removeMut.isPending}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {removeMut.isPending
                ? <ActivityIndicator size="small" color="#EF4444" />
                : <Ionicons name="bookmark" size={20} color="#EF4444" />
              }
            </TouchableOpacity>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 40 },
  authTitle: { fontSize: 24, fontFamily: "PlusJakartaSans_700Bold" },
  authMessage: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  loginButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 6 },
  loginText: { color: "#fff", fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
  list: { padding: 16, gap: 10 },
  screenTitle: { fontSize: 26, fontFamily: "PlusJakartaSans_700Bold", marginBottom: 4 },
  screenSub: { fontSize: 14, marginBottom: 16 },
  bookmarkCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  typeIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  resourceName: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold", lineHeight: 20, marginBottom: 6 },
  resourceMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontFamily: "PlusJakartaSans_700Bold", letterSpacing: 0.4 },
  costBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  costText: { fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold" },
  removeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
