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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/contexts/ApiContext";
import { FolderCard } from "@/components/FolderCard";
import { ResourceCard } from "@/components/ResourceCard";
import { EmptyState } from "@/components/EmptyState";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LibraryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, login } = useAuth();
  const { apiFetch } = useApi();
  const insets = useSafeAreaInsets();
  const [parentId, setParentId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);

  const { data: foldersData, isLoading: foldersLoading, refetch: refetchFolders } = useQuery({
    queryKey: ["folders", parentId],
    queryFn: async () => {
      const url = parentId ? `/api/folders?parentId=${parentId}` : "/api/folders";
      const res = await apiFetch(url);
      return res.json();
    },
  });

  const { data: resourcesData, isLoading: resourcesLoading, refetch: refetchResources } = useQuery({
    queryKey: ["resources", parentId],
    queryFn: async () => {
      if (!parentId) return { resources: [] };
      const res = await apiFetch(`/api/resources?folderId=${parentId}`);
      return res.json();
    },
    enabled: !!parentId,
  });

  const folders = foldersData?.folders || [];
  const resources = resourcesData?.resources || [];
  const isLoading = foldersLoading || resourcesLoading;

  const navigateToFolder = useCallback((folder: { id: string; name: string }) => {
    setBreadcrumbs((prev) => [...prev, folder]);
    setParentId(folder.id);
  }, []);

  const navigateBack = useCallback(() => {
    setBreadcrumbs((prev) => {
      const next = prev.slice(0, -1);
      setParentId(next.length > 0 ? next[next.length - 1].id : null);
      return next;
    });
  }, []);

  const navigateToBreadcrumb = useCallback((index: number) => {
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

  const onRefresh = useCallback(() => {
    refetchFolders();
    refetchResources();
  }, [refetchFolders, refetchResources]);

  const isWeb = Platform.OS === "web";

  if (authLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.authContainer, { backgroundColor: colors.background, paddingTop: isWeb ? 67 : 0 }]}>
        <Ionicons name="library" size={56} color={colors.primary} style={{ opacity: 0.6 }} />
        <Text style={[styles.authTitle, { color: colors.foreground }]}>AcadVault Library</Text>
        <Text style={[styles.authMessage, { color: colors.mutedForeground }]}>
          Sign in to browse academic resources
        </Text>
        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: colors.primary }]}
          onPress={login}
          activeOpacity={0.8}
        >
          <Ionicons name="log-in" size={20} color={colors.primaryForeground} />
          <Text style={[styles.loginText, { color: colors.primaryForeground }]}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const listHeader = (
    <View style={{ paddingTop: isWeb ? 67 : 0 }}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Welcome back, {user?.firstName || user?.username || "Student"}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Library</Text>
        </View>
        <View style={[styles.balanceBadge, { backgroundColor: colors.accent + "20" }]}>
          <Ionicons name="flash" size={16} color={colors.accent} />
          <Text style={[styles.balanceText, { color: colors.accent }]}>{user?.unitsBalance ?? 0}</Text>
        </View>
      </View>

      {breadcrumbs.length > 0 && (
        <View style={styles.breadcrumbRow}>
          <TouchableOpacity onPress={navigateBack} style={styles.backButton} activeOpacity={0.6}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateToBreadcrumb(-1)} activeOpacity={0.6}>
            <Text style={[styles.breadcrumbText, { color: colors.primary }]}>Library</Text>
          </TouchableOpacity>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={b.id}>
              <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
              <TouchableOpacity onPress={() => navigateToBreadcrumb(i)} activeOpacity={0.6}>
                <Text
                  style={[
                    styles.breadcrumbText,
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
      )}

      {folders.length > 0 && (
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>FOLDERS</Text>
      )}
    </View>
  );

  const allItems = [
    ...folders.map((f: any) => ({ ...f, _type: "folder" as const })),
    ...(resources.length > 0 ? [{ _type: "section" as const, id: "resources-header" }] : []),
    ...resources.map((r: any) => ({ ...r, _type: "resource" as const })),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading && !foldersData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 84 : 100 }]}
          ListHeaderComponent={listHeader}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="folder-open" title="No content yet" message="This folder is empty" />
          }
          renderItem={({ item }) => {
            if (item._type === "folder") {
              return <FolderCard folder={item} onPress={() => navigateToFolder(item)} />;
            }
            if (item._type === "section") {
              return (
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 12 }]}>
                  RESOURCES
                </Text>
              );
            }
            return (
              <ResourceCard
                resource={item}
                onPress={() => router.push(`/resource/${item.id}`)}
              />
            );
          }}
        />
      )}
    </View>
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
  authTitle: {
    fontSize: 24,
    fontFamily: "PlusJakartaSans_700Bold",
    marginTop: 12,
  },
  authMessage: { fontSize: 15, textAlign: "center" },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  loginText: { fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: { fontSize: 14, marginBottom: 4 },
  title: { fontSize: 28, fontFamily: "PlusJakartaSans_700Bold" },
  balanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  balanceText: { fontSize: 16, fontFamily: "PlusJakartaSans_700Bold" },
  breadcrumbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  backButton: { marginRight: 4 },
  breadcrumbText: { fontSize: 14 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 1,
    marginBottom: 10,
  },
  list: { padding: 20 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
});
