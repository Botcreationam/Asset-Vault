import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface FolderCardProps {
  folder: {
    id: string;
    name: string;
    description?: string;
    resourceCount?: number;
    subfolderCount?: number;
  };
  onPress: () => void;
}

export function FolderCard({ folder, onPress }: FolderCardProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + "15" }]}>
        <Ionicons name="folder" size={24} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {folder.name}
        </Text>
        {folder.description ? (
          <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={1}>
            {folder.description}
          </Text>
        ) : null}
        <View style={styles.meta}>
          {folder.subfolderCount ? (
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {folder.subfolderCount} folders
            </Text>
          ) : null}
          {folder.resourceCount ? (
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {folder.resourceCount} files
            </Text>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
  meta: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
  },
});
