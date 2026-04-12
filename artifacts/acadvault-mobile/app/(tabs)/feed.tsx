import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/contexts/ApiContext";
import { EmptyState } from "@/components/EmptyState";
import * as Haptics from "expo-haptics";

interface Post {
  id: number;
  authorId: string;
  content: string;
  imageUrl?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author?: { username?: string; firstName?: string; profileImageUrl?: string };
  liked?: boolean;
}

export default function FeedScreen() {
  const colors = useColors();
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState("");
  const isWeb = Platform.OS === "web";

  const { data, isLoading: postsLoading, refetch } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const res = await apiFetch("/api/social/posts");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const createPostMut = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiFetch("/api/social/posts", {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      return res.json();
    },
    onSuccess: () => {
      setNewPost("");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const toggleLikeMut = useMutation({
    mutationFn: async (postId: number) => {
      const res = await apiFetch(`/api/social/posts/${postId}/react`, { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const posts: Post[] = data?.posts || [];

  const formatTime = useCallback((dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }, []);

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
        <Ionicons name="newspaper" size={56} color={colors.primary} style={{ opacity: 0.6 }} />
        <Text style={[styles.authTitle, { color: colors.foreground }]}>Community Feed</Text>
        <Text style={[styles.authMessage, { color: colors.mutedForeground }]}>
          Sign in to join the community
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 84 : 100 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ paddingTop: isWeb ? 67 : 0 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Feed</Text>
            <View style={[styles.postBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.postInput, { color: colors.foreground }]}
                placeholder="Share something with the community..."
                placeholderTextColor={colors.mutedForeground}
                value={newPost}
                onChangeText={setNewPost}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                style={[styles.postButton, { backgroundColor: colors.primary, opacity: newPost.trim() ? 1 : 0.4 }]}
                onPress={() => newPost.trim() && createPostMut.mutate(newPost.trim())}
                disabled={!newPost.trim() || createPostMut.isPending}
                activeOpacity={0.8}
              >
                {createPostMut.isPending ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Ionicons name="send" size={16} color={colors.primaryForeground} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          postsLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState icon="chatbubbles" title="No posts yet" message="Be the first to share something" />
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.postHeader}>
              {item.author?.profileImageUrl ? (
                <Image source={{ uri: item.author.profileImageUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
                  <Ionicons name="person" size={16} color={colors.mutedForeground} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.authorName, { color: colors.foreground }]}>
                  {item.author?.firstName || item.author?.username || "User"}
                </Text>
                <Text style={[styles.postTime, { color: colors.mutedForeground }]}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            </View>
            <Text style={[styles.postContent, { color: colors.foreground }]}>{item.content}</Text>
            <View style={styles.postActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => toggleLikeMut.mutate(item.id)}
                activeOpacity={0.6}
              >
                <Ionicons
                  name={item.liked ? "heart" : "heart-outline"}
                  size={20}
                  color={item.liked ? "#EF4444" : colors.mutedForeground}
                />
                <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
                  {item.likesCount || ""}
                </Text>
              </TouchableOpacity>
              <View style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
                  {item.commentsCount || ""}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
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
  authTitle: { fontSize: 24, fontFamily: "PlusJakartaSans_700Bold", marginTop: 12 },
  authMessage: { fontSize: 15, textAlign: "center" },
  loginButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  loginText: { fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
  title: {
    fontSize: 28,
    fontFamily: "PlusJakartaSans_700Bold",
    marginBottom: 16,
  },
  list: { padding: 20 },
  postBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  postInput: { flex: 1, fontSize: 15, maxHeight: 100, minHeight: 40 },
  postButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  postCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  authorName: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold" },
  postTime: { fontSize: 12 },
  postContent: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  postActions: {
    flexDirection: "row",
    gap: 24,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
  },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { fontSize: 14 },
});
