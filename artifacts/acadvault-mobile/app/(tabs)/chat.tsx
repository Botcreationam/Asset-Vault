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
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/contexts/ApiContext";
import { EmptyState } from "@/components/EmptyState";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import * as Haptics from "expo-haptics";

const isWeb = Platform.OS === "web";

function Avatar({ user, size = 38 }: { user?: any; size?: number }) {
  const colors = useColors();
  if (user?.profileImageUrl) {
    return <Image source={{ uri: user.profileImageUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  const name = user?.firstName || user?.username || user?.nickname || "?";
  const initial = name[0].toUpperCase();
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: "#142042",
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: "#fff", fontSize: size * 0.38, fontFamily: "PlusJakartaSans_600SemiBold" }}>{initial}</Text>
    </View>
  );
}

function formatTime(dateStr?: string | null) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function NewChatModal({ visible, onClose, onSelect }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (userId: string, userName: string) => void;
}) {
  const colors = useColors();
  const { apiFetch } = useApi();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["chatUsers"],
    queryFn: async () => {
      const res = await apiFetch("/api/chat/users");
      return res.json();
    },
    enabled: visible,
    staleTime: 30_000,
  });

  const users: any[] = (data?.users || []).filter((u: any) => {
    const name = `${u.firstName || ""} ${u.lastName || ""} ${u.username || ""} ${u.nickname || ""}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Start a Conversation</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Ionicons name="close" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <View style={[styles.searchBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search users..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : users.length === 0 ? (
          <EmptyState icon="people" title="No users found" message="Try a different search" />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {users.map((u) => {
              const name = u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.username || "User";
              return (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.userRow, { borderBottomColor: colors.border }]}
                  onPress={() => { onSelect(u.id, name); onClose(); }}
                  activeOpacity={0.7}
                >
                  <Avatar user={u} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.userName, { color: colors.foreground }]}>{name}</Text>
                    {u.username && <Text style={[styles.userHandle, { color: colors.mutedForeground }]}>@{u.username}</Text>}
                  </View>
                  <Ionicons name="chatbubble-outline" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const { isAuthenticated, isLoading, login } = useAuth();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);

  const { data, isLoading: convLoading, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await apiFetch("/api/chat/conversations");
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });

  const createConvMut = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiFetch("/api/chat/conversations", {
        method: "POST",
        body: JSON.stringify({ participantId: userId }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/chat/${data.conversation?.id || data.id}` as Href);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const conversations = data?.conversations || [];

  if (isLoading) {
    return <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="chatbubbles" size={56} color={colors.primary} style={{ opacity: 0.5 }} />
        <Text style={[styles.authTitle, { color: colors.foreground }]}>Private Messages</Text>
        <Text style={[styles.authMessage, { color: colors.mutedForeground }]}>Sign in to chat with other students</Text>
        <TouchableOpacity style={[styles.loginButton, { backgroundColor: colors.primary }]} onPress={login} activeOpacity={0.85}>
          <Ionicons name="log-in" size={18} color="#fff" />
          <Text style={styles.loginText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 84 : 110 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ paddingTop: isWeb ? 67 : insets.top + 8 }}>
            <View style={styles.screenHeader}>
              <Text style={[styles.screenTitle, { color: colors.foreground }]}>Messages</Text>
              <TouchableOpacity
                style={[styles.newChatBtn, { backgroundColor: colors.primary }]}
                onPress={() => setNewChatOpen(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.newChatText}>New Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          convLoading
            ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
            : <EmptyState icon="chatbubbles-outline" title="No conversations yet" message="Tap 'New Chat' to start a conversation with a classmate" />
        }
        renderItem={({ item }) => {
          const other = item.otherParticipant;
          const name = other?.firstName
            ? `${other.firstName} ${other.lastName || ""}`.trim()
            : other?.username || "User";
          return (
            <TouchableOpacity
              style={[styles.convRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/chat/${item.id}` as Href)}
              activeOpacity={0.75}
            >
              <Avatar user={other} size={46} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.convTop}>
                  <Text style={[styles.convName, { color: colors.foreground }]} numberOfLines={1}>{name}</Text>
                  <Text style={[styles.convTime, { color: colors.mutedForeground }]}>{formatTime(item.lastMessageAt)}</Text>
                </View>
                <Text style={[styles.convPreview, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.lastMessage || "Start a conversation"}
                </Text>
              </View>
              {item.unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.unreadText}>{item.unreadCount > 9 ? "9+" : item.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <NewChatModal
        visible={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onSelect={(userId) => {
          setNewChatOpen(false);
          createConvMut.mutate(userId);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 40 },
  authTitle: { fontSize: 24, fontFamily: "PlusJakartaSans_700Bold" },
  authMessage: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  loginButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 6 },
  loginText: { color: "#fff", fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
  list: { padding: 16, gap: 8 },
  screenHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  screenTitle: { fontSize: 26, fontFamily: "PlusJakartaSans_700Bold" },
  newChatBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  newChatText: { color: "#fff", fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold" },
  convRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  convTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  convName: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold", flex: 1 },
  convTime: { fontSize: 12, marginLeft: 8 },
  convPreview: { fontSize: 13, lineHeight: 18 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  unreadText: { color: "#fff", fontSize: 11, fontFamily: "PlusJakartaSans_700Bold" },
  // Modal
  modalContainer: { flex: 1, paddingHorizontal: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "PlusJakartaSans_700Bold" },
  modalClose: { padding: 4 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 15 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  userName: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold" },
  userHandle: { fontSize: 13, marginTop: 2 },
});
