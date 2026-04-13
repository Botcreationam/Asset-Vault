import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApi } from "@/contexts/ApiContext";
import { ResourceCard } from "@/components/ResourceCard";
import { EmptyState } from "@/components/EmptyState";
import * as Haptics from "expo-haptics";

const isWeb = Platform.OS === "web";

const TYPES = [
  { label: "All", value: "" },
  { label: "PDF", value: "pdf" },
  { label: "Notes", value: "notes" },
  { label: "Books", value: "book" },
  { label: "Slides", value: "slides" },
  { label: "Videos", value: "video" },
];

export default function SearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const { apiFetch } = useApi();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeType, setActiveType] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ["search", debouncedQuery, activeType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("search", debouncedQuery);
      if (activeType) params.set("type", activeType);
      const res = await apiFetch(`/api/resources?${params.toString()}`);
      return res.json();
    },
    enabled: debouncedQuery.length >= 2 || activeType !== "",
    staleTime: 30_000,
  });

  const resources = data?.resources || [];

  const clearSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
  }, []);

  const handleTypeFilter = useCallback((type: string) => {
    Haptics.selectionAsync();
    setActiveType(type);
  }, []);

  const hasSearch = debouncedQuery.length >= 2 || activeType !== "";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 12 }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Search</Text>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Search resources, subjects..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {query.length > 0 && Platform.OS !== "ios" && (
            <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {TYPES.map((t) => {
            const active = activeType === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.filterChip,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.muted, borderColor: colors.border },
                ]}
                onPress={() => handleTypeFilter(t.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterText, { color: active ? "#fff" : colors.mutedForeground }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !hasSearch ? (
        <EmptyState
          icon="search"
          title="Find resources"
          message="Search by name, subject, or keyword — or pick a type above"
        />
      ) : resources.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="No results"
          message={debouncedQuery ? `Nothing found for "${debouncedQuery}"` : "No resources of this type yet"}
        />
      ) : (
        <FlatList
          data={resources}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 84 : 110 }]}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
              {resources.length} result{resources.length !== 1 ? "s" : ""}
            </Text>
          }
          renderItem={({ item }) => (
            <ResourceCard resource={item} onPress={() => router.push(`/resource/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  screenTitle: { fontSize: 26, fontFamily: "PlusJakartaSans_700Bold" },
  searchBar: {
    flexDirection: "row", alignItems: "center",
    gap: 10, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1,
  },
  input: { flex: 1, fontSize: 16 },
  filterRow: { gap: 8, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  filterText: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium" },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  resultCount: { fontSize: 13, marginBottom: 10 },
});
