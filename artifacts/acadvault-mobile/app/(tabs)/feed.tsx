import React, { useState, useCallback, useRef } from "react";
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
  Animated,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/contexts/ApiContext";
import { EmptyState } from "@/components/EmptyState";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

const isWeb = Platform.OS === "web";

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  author?: { username?: string; firstName?: string; profileImageUrl?: string };
}

interface Post {
  id: number;
  content: string;
  imageUrl?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author?: { username?: string; firstName?: string; profileImageUrl?: string };
  liked?: boolean;
}

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Avatar({ user, size = 38 }: { user?: Post["author"]; size?: number }) {
  const colors = useColors();
  if (user?.profileImageUrl) {
    return <Image source={{ uri: user.profileImageUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  const initial = (user?.firstName || user?.username || "U")[0].toUpperCase();
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: "#142042",
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: "#fff", fontSize: size * 0.4, fontFamily: "PlusJakartaSans_600SemiBold" }}>{initial}</Text>
    </View>
  );
}

function CommentItem({ comment, colors }: { comment: Comment; colors: any }) {
  return (
    <View style={[styles.commentRow, { borderTopColor: colors.border }]}>
      <Avatar user={comment.author} size={28} />
      <View style={{ flex: 1 }}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentAuthor, { color: colors.foreground }]}>
            {comment.author?.firstName || comment.author?.username || "User"}
          </Text>
          <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>{formatTime(comment.createdAt)}</Text>
        </View>
        <Text style={[styles.commentContent, { color: colors.foreground }]}>{comment.content}</Text>
      </View>
    </View>
  );
}

function PostCard({
  post,
  onLike,
  isLiking,
  colors,
  apiFetch,
  queryClient,
}: {
  post: Post;
  onLike: (id: number) => void;
  isLiking: boolean;
  colors: any;
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>;
  queryClient: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");

  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ["comments", post.id],
    queryFn: async () => {
      const res = await apiFetch(`/api/social/posts/${post.id}/comments`);
      return res.json();
    },
    enabled: expanded,
    staleTime: 30_000,
  });

  const addCommentMut = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiFetch(`/api/social/posts/${post.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["comments", post.id] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Keyboard.dismiss();
    },
  });

  const comments: Comment[] = commentsData?.comments || [];
  const authorName = post.author?.firstName || post.author?.username || "Student";

  return (
    <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.postHeader}>
        <Avatar user={post.author} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.authorName, { color: colors.foreground }]}>{authorName}</Text>
          <Text style={[styles.postTime, { color: colors.mutedForeground }]}>{formatTime(post.createdAt)}</Text>
        </View>
      </View>

      {/* Content */}
      <Text style={[styles.postContent, { color: colors.foreground }]}>{post.content}</Text>

      {/* Actions */}
      <View style={[styles.postActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => { onLike(post.id); }}
          activeOpacity={0.6}
          disabled={isLiking}
        >
          <Ionicons
            name={post.liked ? "heart" : "heart-outline"}
            size={20}
            color={post.liked ? "#EF4444" : colors.mutedForeground}
          />
          {post.likesCount > 0 && (
            <Text style={[styles.actionCount, { color: post.liked ? "#EF4444" : colors.mutedForeground }]}>
              {post.likesCount}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.6}
        >
          <Ionicons
            name={expanded ? "chatbubble" : "chatbubble-outline"}
            size={19}
            color={expanded ? colors.primary : colors.mutedForeground}
          />
          {post.commentsCount > 0 && (
            <Text style={[styles.actionCount, { color: colors.mutedForeground }]}>
              {post.commentsCount}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Comments section */}
      {expanded && (
        <View style={[styles.commentsSection, { borderTopColor: colors.border }]}>
          {commentsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
          ) : comments.length === 0 ? (
            <Text style={[styles.noComments, { color: colors.mutedForeground }]}>No comments yet. Be first!</Text>
          ) : (
            comments.map((c) => <CommentItem key={c.id} comment={c} colors={colors} />)
          )}

          <View style={[styles.addComment, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <TextInput
              style={[styles.commentInput, { color: colors.foreground }]}
              placeholder="Add a comment..."
              placeholderTextColor={colors.mutedForeground}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={() => commentText.trim() && addCommentMut.mutate(commentText.trim())}
              disabled={!commentText.trim() || addCommentMut.isPending}
              style={[styles.sendBtn, {
                backgroundColor: commentText.trim() ? colors.primary : colors.border,
              }]}
              activeOpacity={0.8}
            >
              {addCommentMut.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={14} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function FeedScreen() {
  const colors = useColors();
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [newPost, setNewPost] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading: postsLoading, refetch } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const res = await apiFetch("/api/social/posts");
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
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
      Keyboard.dismiss();
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const posts: Post[] = data?.posts || [];

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="newspaper" size={56} color={colors.primary} style={{ opacity: 0.5 }} />
        <Text style={[styles.authTitle, { color: colors.foreground }]}>Community Feed</Text>
        <Text style={[styles.authMessage, { color: colors.mutedForeground }]}>
          Sign in to join the conversation
        </Text>
        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: colors.primary }]}
          onPress={login}
          activeOpacity={0.85}
        >
          <Ionicons name="log-in" size={18} color="#fff" />
          <Text style={styles.loginText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 84 : 110 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={{ paddingTop: isWeb ? 67 : insets.top + 8 }}>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>Community Feed</Text>

            {/* Compose box */}
            <View style={[styles.composeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Avatar user={user ? { firstName: user.firstName, username: user.username, profileImageUrl: user.profileImageUrl } : undefined} size={36} />
              <TextInput
                style={[styles.composeInput, { color: colors.foreground }]}
                placeholder="Share something with the community..."
                placeholderTextColor={colors.mutedForeground}
                value={newPost}
                onChangeText={setNewPost}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                style={[styles.composeBtn, {
                  backgroundColor: newPost.trim() ? colors.primary : colors.muted,
                }]}
                onPress={() => newPost.trim() && createPostMut.mutate(newPost.trim())}
                disabled={!newPost.trim() || createPostMut.isPending}
                activeOpacity={0.8}
              >
                {createPostMut.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={15} color={newPost.trim() ? "#fff" : colors.mutedForeground} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          postsLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
          ) : (
            <EmptyState icon="chatbubbles" title="No posts yet" message="Be the first to share something with the community" />
          )
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={(id) => toggleLikeMut.mutate(id)}
            isLiking={toggleLikeMut.isPending}
            colors={colors}
            apiFetch={apiFetch}
            queryClient={queryClient}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 40 },
  authTitle: { fontSize: 24, fontFamily: "PlusJakartaSans_700Bold" },
  authMessage: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  loginText: { color: "#fff", fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
  list: { padding: 16 },
  screenTitle: { fontSize: 26, fontFamily: "PlusJakartaSans_700Bold", marginBottom: 14 },
  composeBox: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  composeInput: { flex: 1, fontSize: 15, maxHeight: 90, minHeight: 36 },
  composeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  // Post card
  postCard: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    paddingBottom: 10,
  },
  authorName: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold" },
  postTime: { fontSize: 12, marginTop: 1 },
  postContent: { fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 12 },
  postActions: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 4, marginRight: 10 },
  actionCount: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium" },
  // Comments
  commentsSection: { borderTopWidth: StyleSheet.hairlineWidth, padding: 14, gap: 4 },
  commentRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  commentAuthor: { fontSize: 13, fontFamily: "PlusJakartaSans_600SemiBold" },
  commentTime: { fontSize: 11 },
  commentContent: { fontSize: 14, lineHeight: 19 },
  noComments: { fontSize: 13, textAlign: "center", paddingVertical: 10, fontStyle: "italic" },
  addComment: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  commentInput: { flex: 1, fontSize: 14, maxHeight: 70, minHeight: 28 },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
