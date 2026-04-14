import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/contexts/ApiContext";
import * as Haptics from "expo-haptics";

interface Message {
  id: number;
  content: string;
  createdAt: string;
  senderId: string;
  sender?: { username?: string; firstName?: string; profileImageUrl?: string };
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ user, size = 32 }: { user?: any; size?: number }) {
  if (user?.profileImageUrl) {
    return <Image source={{ uri: user.profileImageUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  const initial = (user?.firstName || user?.username || "?")[0].toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#142042", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontSize: size * 0.4, fontFamily: "PlusJakartaSans_600SemiBold" }}>{initial}</Text>
    </View>
  );
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/chat/conversations/${id}/messages`);
      return res.json();
    },
    enabled: !!id,
    staleTime: 5_000,
    refetchInterval: 5_000,
  });

  const { data: convData } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await apiFetch("/api/chat/conversations");
      return res.json();
    },
    staleTime: 60_000,
  });

  const messages: Message[] = data?.messages || [];
  const conversation = convData?.conversations?.find((c: any) => String(c.id) === String(id));
  const other = conversation?.otherParticipant;
  const otherName = other?.firstName
    ? `${other.firstName} ${other.lastName || ""}`.trim()
    : other?.username || "Chat";

  const sendMut = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiFetch(`/api/chat/conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      return res.json();
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    sendMut.mutate(text.trim());
  }, [text, sendMut]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages.length]);

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = String(item.senderId) === String(user?.id);
    const prevItem = index > 0 ? messages[index - 1] : null;
    const showAvatar = !isMe && (!prevItem || String(prevItem.senderId) !== String(item.senderId));

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMe && (
          <View style={{ width: 32, alignItems: "center", justifyContent: "flex-end" }}>
            {showAvatar ? <Avatar user={item.sender} size={28} /> : null}
          </View>
        )}
        <View style={{ maxWidth: "75%" }}>
          <View style={[
            styles.bubble,
            isMe
              ? { backgroundColor: "#142042", borderBottomRightRadius: 4 }
              : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 4 },
          ]}>
            <Text style={[styles.bubbleText, { color: isMe ? "#fff" : colors.foreground }]}>{item.content}</Text>
          </View>
          <Text style={[styles.msgTime, { color: colors.mutedForeground, textAlign: isMe ? "right" : "left" }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        {other && <Avatar user={other} size={36} />}
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>{otherName}</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Private conversation</Text>
        </View>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.messageList, { paddingBottom: 16 }]}
          renderItem={renderMessage}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={40} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyChatText, { color: colors.mutedForeground }]}>Say hello!</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={[styles.inputBar, { borderTopColor: colors.border, paddingBottom: insets.bottom + 8, backgroundColor: colors.background }]}>
        <TextInput
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.border }]}
          onPress={handleSend}
          disabled={!text.trim() || sendMut.isPending}
          activeOpacity={0.8}
        >
          {sendMut.isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={16} color={text.trim() ? "#fff" : colors.mutedForeground} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center",
    gap: 10, paddingHorizontal: 12, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4, marginRight: 2 },
  headerName: { fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
  headerSub: { fontSize: 12, marginTop: 1 },
  messageList: { padding: 12, gap: 4 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 4 },
  msgRowLeft: { justifyContent: "flex-start" },
  msgRowRight: { justifyContent: "flex-end" },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  msgTime: { fontSize: 10, marginTop: 3, paddingHorizontal: 4 },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyChatText: { fontSize: 15 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end",
    gap: 10, paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1, borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, maxHeight: 100, minHeight: 42,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
  },
});
