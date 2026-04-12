import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useApi } from "@/contexts/ApiContext";
import { ResourceCard } from "@/components/ResourceCard";
import { EmptyState } from "@/components/EmptyState";

export default function SearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const { apiFetch } = useApi();
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const isWeb = Platform.OS === "web";

  const { data, isLoading } = useQuery({
    queryKey: ["search", searchTerm],
    queryFn: async () => {
      if (!searchTerm) return { resources: [] };
      const res = await apiFetch(`/api/resources?search=${encodeURIComponent(searchTerm)}`);
      return res.json();
    },
    enabled: searchTerm.length >= 2,
  });

  const resources = data?.resources || [];

  const handleSearch = useCallback(() => {
    setSearchTerm(query.trim());
  }, [query]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : 0 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Search</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Search resources..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setSearchTerm(""); }}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : searchTerm && resources.length === 0 ? (
        <EmptyState
          icon="search"
          title="No results"
          message={`No resources found for "${searchTerm}"`}
        />
      ) : !searchTerm ? (
        <EmptyState
          icon="search"
          title="Find resources"
          message="Search by name, subject, or keyword"
        />
      ) : (
        <FlatList
          data={resources}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 84 : 100 }]}
          renderItem={({ item }) => (
            <ResourceCard resource={item} onPress={() => router.push(`/resource/${item.id}`)} />
          )}
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
              {resources.length} result{resources.length !== 1 ? "s" : ""}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: {
    fontSize: 28,
    fontFamily: "PlusJakartaSans_700Bold",
    marginBottom: 16,
    marginTop: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 16 },
  list: { paddingHorizontal: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  resultCount: { fontSize: 13, marginBottom: 12, marginTop: 4 },
});
