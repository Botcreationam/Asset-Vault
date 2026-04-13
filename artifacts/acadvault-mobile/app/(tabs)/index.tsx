import React, { useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  SectionList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/contexts/ApiContext";
import { FolderCard } from "@/components/FolderCard";
import { ResourceCard } from "@/components/ResourceCard";
import { EmptyState } from "@/components/EmptyState";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_W = Math.min(200, SCREEN_WIDTH * 0.52);
const isWeb = Platform.OS === "web";

// ── Mini resource card for horizontal carousels ────────────────────────────
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

function MiniResourceCard({ resource, onPress, colors }: { resource: any; onPress: () => void; colors: any }) {
  const typeColor = TYPE_COLORS[resource.type] || TYPE_COLORS.other;
  const iconName = TYPE_ICONS[resource.type] || TYPE_ICONS.other;
  return (
    <TouchableOpacity
      style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border, width: CARD_W }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.miniIcon, { backgroundColor: typeColor + "18" }]}>
        <Ionicons name={iconName as any} size={20} color={typeColor} />
      </View>
      <Text style={[styles.miniName, { color: colors.foreground }]} numberOfLines={2}>
        {resource.name}
      </Text>
      <View style={styles.miniMeta}>
        <View style={[styles.miniType, { backgroundColor: typeColor + "20" }]}>
          <Text style={[styles.miniTypeText, { color: typeColor }]}>{resource.type?.toUpperCase()}</Text>
        </View>
        <View style={styles.miniCost}>
          <Ionicons name="flash" size={11} color={colors.accent} />
          <Text style={[styles.miniCostText, { color: colors.accent }]}>{resource.downloadCost}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Discovery section carousel ─────────────────────────────────────────────
function DiscoveryRow({
  title,
  icon,
  resources,
  onPress,
  colors,
}: {
  title: string;
  icon: string;
  resources: any[];
  onPress: (id: string) => void;
  colors: any;
}) {
  if (!resources || resources.length === 0) return null;
  return (
    <View style={styles.discoveryRow}>
      <View style={styles.rowHeader}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
        <Text style={[styles.rowTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
        {resources.map((r: any) => (
          <MiniResourceCard key={r.id} resource={r} onPress={() => onPress(r.id)} colors={colors} />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Sign-in prompt ─────────────────────────────────────────────────────────
function SignInPrompt({ login, colors }: { login: () => void; colors: any }) {
  return (
    <View style={[styles.authContainer, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#142042", "#1e3a6e"]}
        style={styles.authHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="library" size={48} color="rgba(255,255,255,0.8)" />
        <Text style={styles.authHeroTitle}>AcadVault Library</Text>
        <Text style={styles.authHeroSub}>Your academic resource vault</Text>
      </LinearGradient>
      <View style={styles.authBody}>
        <Text style={[styles.authMessage, { color: colors.mutedForeground }]}>
          Sign in to browse thousands of curated academic materials, download resources, and connect with fellow students.
        </Text>
        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: colors.primary }]}
          onPress={login}
          activeOpacity={0.85}
        >
          <Ionicons name="log-in" size={20} color="#fff" />
          <Text style={styles.loginText}>Sign In to Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function LibraryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, login } = useAuth();
  const { apiFetch } = useApi();
  const insets = useSafeAreaInsets();
  const [parentId, setParentId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const isHome = parentId === null;

  const { data: foldersData, isLoading: foldersLoading, refetch: refetchFolders } = useQuery({
    queryKey: ["folders", parentId],
    queryFn: async () => {
      const url = parentId ? `/api/folders?parentId=${parentId}` : "/api/folders";
      const res = await apiFetch(url);
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: resourcesData, isLoading: resourcesLoading, refetch: refetchResources } = useQuery({
    queryKey: ["resources", parentId],
    queryFn: async () => {
      if (!parentId) return { resources: [] };
      const res = await apiFetch(`/api/resources?folderId=${parentId}`);
      return res.json();
    },
    enabled: !!parentId && isAuthenticated,
  });

  const { data: trendingData, refetch: refetchTrending } = useQuery({
    queryKey: ["trending"],
    queryFn: async () => {
      const res = await apiFetch("/api/discovery/trending");
      return res.json();
    },
    enabled: isAuthenticated && isHome,
    staleTime: 120_000,
  });

  const { data: recentData, refetch: refetchRecent } = useQuery({
    queryKey: ["recent"],
    queryFn: async () => {
      const res = await apiFetch("/api/discovery/recent");
      return res.json();
    },
    enabled: isAuthenticated && isHome,
    staleTime: 60_000,
  });

  const folders = foldersData?.folders || [];
  const resources = resourcesData?.resources || [];
  const trending = trendingData?.resources || [];
  const recent = recentData?.resources || [];

  const navigateToFolder = useCallback((folder: { id: string; name: string }) => {
    Haptics.selectionAsync();
    setBreadcrumbs((prev) => [...prev, folder]);
    setParentId(folder.id);
  }, []);

  const navigateBack = useCallback(() => {
    Haptics.selectionAsync();
    setBreadcrumbs((prev) => {
      const next = prev.slice(0, -1);
      setParentId(next.length > 0 ? next[next.length - 1].id : null);
      return next;
    });
  }, []);

  const navigateToBreadcrumb = useCallback((index: number) => {
    Haptics.selectionAsync();
    if (index === -1) {
      setBreadcrumbs([]);
      setParentId(null);
    } else {
      setBreadcrumbs((prev) => {
        const next = prev.slice(0, index + 1);
        setParentId(next[next.length - 1].id);
        return next;
      });
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFolders(), refetchResources(), refetchTrending(), refetchRecent()]);
    setRefreshing(false);
  }, [refetchFolders, refetchResources, refetchTrending, refetchRecent]);

  const goToResource = useCallback((id: string) => {
    router.push(`/resource/${id}`);
  }, [router]);

  if (authLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <SignInPrompt login={login} colors={colors} />;
  }

  // ── List items for current folder ──────────────────────────────────────
  const allItems = [
    ...folders.map((f: any) => ({ ...f, _type: "folder" as const })),
    ...(resources.length > 0 ? [{ _type: "section" as const, id: "resources-header" }] : []),
    ...resources.map((r: any) => ({ ...r, _type: "resource" as const })),
  ];

  // ── Header rendered above the list ────────────────────────────────────
  const listHeader = (
    <View style={{ paddingTop: isWeb ? 67 : insets.top }}>
      {isHome ? (
        // ── Discovery home header ──────────────────────────────────────
        <>
          <LinearGradient
            colors={["#142042", "#1a3060"]}
            style={[styles.homeHero, { paddingTop: isWeb ? 0 : 12 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroGreeting}>Welcome back,</Text>
                <Text style={styles.heroName} numberOfLines={1}>
                  {user?.nickname || user?.firstName || user?.username || "Student"} 👋
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.unitsBadge, { backgroundColor: colors.accent + "25" }]}
                onPress={() => router.push("/(tabs)/account")}
                activeOpacity={0.8}
              >
                <Ionicons name="flash" size={16} color={colors.accent} />
                <Text style={[styles.unitsText, { color: colors.accent }]}>{user?.unitsBalance ?? 0}</Text>
                <Text style={styles.unitsLabel}>units</Text>
              </TouchableOpacity>
            </View>

            {user?.isTrialActive && (
              <View style={styles.trialBanner}>
                <Ionicons name="gift" size={14} color="#FCD34D" />
                <Text style={styles.trialText}>
                  🎓 Free trial — {user.trialDaysRemaining} day{user.trialDaysRemaining !== 1 ? "s" : ""} remaining · All downloads free
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Discovery carousels */}
          <DiscoveryRow
            title="Trending"
            icon="trending-up"
            resources={trending}
            onPress={goToResource}
            colors={colors}
          />
          <DiscoveryRow
            title="Recently Added"
            icon="time"
            resources={recent}
            onPress={goToResource}
            colors={colors}
          />

          {/* Browse library heading */}
          <View style={[styles.browseHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="folder-open" size={18} color={colors.primary} />
            <Text style={[styles.browseTitle, { color: colors.foreground }]}>Browse Library</Text>
          </View>
        </>
      ) : (
        // ── Folder navigation header ───────────────────────────────────
        <View style={styles.folderHeader}>
          <TouchableOpacity onPress={navigateBack} style={styles.backBtn} activeOpacity={0.6}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={styles.breadcrumbRow}>
              <TouchableOpacity onPress={() => navigateToBreadcrumb(-1)} activeOpacity={0.6}>
                <Text style={[styles.breadcrumb, { color: colors.primary }]}>Library</Text>
              </TouchableOpacity>
              {breadcrumbs.map((b, i) => (
                <React.Fragment key={b.id}>
                  <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
                  <TouchableOpacity onPress={() => navigateToBreadcrumb(i)} activeOpacity={0.6}>
                    <Text
                      style={[
                        styles.breadcrumb,
                        i === breadcrumbs.length - 1
                          ? { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" }
                          : { color: colors.primary },
                      ]}
                      numberOfLines={1}
                    >
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {folders.length > 0 && !isHome && (
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>FOLDERS</Text>
      )}
      {folders.length > 0 && isHome && (
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ALL FOLDERS</Text>
      )}
    </View>
  );

  const isLoading = foldersLoading || resourcesLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading && !foldersData ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 84 : 110 }]}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            isHome ? null : (
              <EmptyState icon="folder-open" title="Empty folder" message="No content in this folder yet" />
            )
          }
          renderItem={({ item }) => {
            if (item._type === "folder") {
              return (
                <View style={{ paddingHorizontal: 16 }}>
                  <FolderCard folder={item} onPress={() => navigateToFolder(item)} />
                </View>
              );
            }
            if (item._type === "section") {
              return <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 12 }]}>RESOURCES</Text>;
            }
            return (
              <View style={{ paddingHorizontal: 16 }}>
                <ResourceCard resource={item} onPress={() => goToResource(item.id)} />
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  // Sign-in
  authContainer: { flex: 1 },
  authHero: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 10,
  },
  authHeroTitle: { color: "#fff", fontSize: 26, fontFamily: "PlusJakartaSans_700Bold", marginTop: 8 },
  authHeroSub: { color: "rgba(255,255,255,0.65)", fontSize: 15 },
  authBody: { padding: 28, gap: 16 },
  authMessage: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 14,
  },
  loginText: { fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold", color: "#fff" },
  // Home hero
  homeHero: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    padding: 20,
    marginBottom: 4,
    gap: 12,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroGreeting: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginBottom: 3 },
  heroName: { color: "#fff", fontSize: 22, fontFamily: "PlusJakartaSans_700Bold" },
  unitsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  unitsText: { fontSize: 17, fontFamily: "PlusJakartaSans_700Bold" },
  unitsLabel: { color: "rgba(255,255,255,0.55)", fontSize: 12 },
  trialBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trialText: { color: "#FCD34D", fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", flex: 1 },
  // Discovery
  discoveryRow: { marginTop: 20, paddingLeft: 16 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12, paddingRight: 16 },
  rowTitle: { fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
  carousel: { paddingRight: 16, gap: 12 },
  miniCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  miniIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  miniName: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", lineHeight: 18 },
  miniMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  miniType: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miniTypeText: { fontSize: 9, fontFamily: "PlusJakartaSans_700Bold", letterSpacing: 0.4 },
  miniCost: { flexDirection: "row", alignItems: "center", gap: 2 },
  miniCostText: { fontSize: 13, fontFamily: "PlusJakartaSans_700Bold" },
  // Browse header
  browseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  browseTitle: { fontSize: 17, fontFamily: "PlusJakartaSans_600SemiBold" },
  // Folder header
  folderHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  backBtn: { padding: 4 },
  breadcrumbRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  breadcrumb: { fontSize: 14, maxWidth: 140 },
  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 1,
    marginBottom: 10,
    marginHorizontal: 16,
    marginTop: 4,
  },
  list: { paddingTop: 0 },
});
