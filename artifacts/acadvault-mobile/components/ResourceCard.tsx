import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

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

interface ResourceCardProps {
  resource: {
    id: string;
    name: string;
    type: string;
    downloadCost: number;
    viewCount?: number;
    downloadCount?: number;
    fileSize?: number;
  };
  onPress: () => void;
}

function formatBytes(bytes?: number) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ResourceCard({ resource, onPress }: ResourceCardProps) {
  const colors = useColors();
  const typeColor = TYPE_COLORS[resource.type] || TYPE_COLORS.other;
  const iconName = TYPE_ICONS[resource.type] || TYPE_ICONS.other;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: typeColor + "15" }]}>
        <Ionicons name={iconName as any} size={22} color={typeColor} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {resource.name}
        </Text>
        <View style={styles.meta}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + "20" }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>
              {resource.type.toUpperCase()}
            </Text>
          </View>
          {formatBytes(resource.fileSize) ? (
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {formatBytes(resource.fileSize)}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.costContainer}>
        <Ionicons name="flash" size={14} color={colors.accent} />
        <Text style={[styles.cost, { color: colors.accent }]}>{resource.downloadCost}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_500Medium",
    lineHeight: 20,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 0.5,
  },
  metaText: {
    fontSize: 12,
  },
  costContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingLeft: 8,
  },
  cost: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_700Bold",
  },
});
