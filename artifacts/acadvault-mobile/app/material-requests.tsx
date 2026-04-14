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
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/contexts/ApiContext";
import { EmptyState } from "@/components/EmptyState";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  in_progress: "#3B82F6",
  fulfilled: "#22C55E",
  rejected: "#EF4444",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  fulfilled: "Fulfilled",
  rejected: "Rejected",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function NewRequestModal({ visible, onClose, onSubmit }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; courseCode?: string }) => void;
}) {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const insets = useSafeAreaInsets();

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), courseCode: courseCode.trim() || undefined });
    setTitle("");
    setDescription("");
    setCourseCode("");
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top || 20 }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Request a Resource</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
            <View>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Resource Title *</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                placeholder="E.g. Introduction to Thermodynamics Notes"
                placeholderTextColor={colors.mutedForeground}
                value={title}
                onChangeText={setTitle}
                maxLength={200}
              />
            </View>

            <View>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Course Code</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                placeholder="E.g. ENG301"
                placeholderTextColor={colors.mutedForeground}
                value={courseCode}
                onChangeText={setCourseCode}
                maxLength={20}
                autoCapitalize="characters"
              />
            </View>

            <View>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Description</Text>
              <TextInput
                style={[styles.fieldTextarea, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                placeholder="Describe what you're looking for in detail..."
                placeholderTextColor={colors.mutedForeground}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: title.trim() ? "#142042" : colors.muted }]}
              onPress={handleSubmit}
              disabled={!title.trim()}
              activeOpacity={0.85}
            >
              <Ionicons name="paper-plane" size={18} color={title.trim() ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.submitBtnText, { color: title.trim() ? "#fff" : colors.mutedForeground }]}>Submit Request</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function MaterialRequestsScreen() {
  const colors = useColors();
  const { isAuthenticated, isLoading } = useAuth();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading: reqLoading, refetch } = useQuery({
    queryKey: ["materialRequests"],
    queryFn: async () => {
      const res = await apiFetch("/api/material-requests");
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: async (payload: { title: string; description: string; courseCode?: string }) => {
      const res = await apiFetch("/api/material-requests", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materialRequests"] });
      setModalOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const requests = data?.requests || data || [];

  if (isLoading) {
    return <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={Array.isArray(requests) ? requests : []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: 110 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + 8 }}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.screenTitle, { color: colors.foreground }]}>Material Requests</Text>
              <TouchableOpacity
                style={[styles.newBtn, { backgroundColor: colors.primary }]}
                onPress={() => setModalOpen(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
              Request academic resources you need
            </Text>
          </View>
        }
        ListEmptyComponent={
          reqLoading
            ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
            : <EmptyState
                icon="document-text-outline"
                title="No requests yet"
                message="Tap the + button to request a specific resource"
              />
        }
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
          const statusLabel = STATUS_LABELS[item.status] || item.status;

          return (
            <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.requestTitle, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
                  {item.courseCode && (
                    <Text style={[styles.courseCode, { color: colors.mutedForeground }]}>{item.courseCode}</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>
              {item.description ? (
                <Text style={[styles.requestDesc, { color: colors.mutedForeground }]} numberOfLines={3}>{item.description}</Text>
              ) : null}
              {item.adminNotes ? (
                <View style={[styles.adminNote, { backgroundColor: "#142042" + "18", borderColor: "#142042" + "30" }]}>
                  <Ionicons name="information-circle" size={14} color="#142042" />
                  <Text style={[styles.adminNoteText, { color: colors.foreground }]}>{item.adminNotes}</Text>
                </View>
              ) : null}
              <Text style={[styles.requestDate, { color: colors.mutedForeground }]}>
                Submitted {formatDate(item.createdAt)}
              </Text>
            </View>
          );
        }}
      />

      <NewRequestModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(data) => createMut.mutate(data)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  backBtn: { padding: 4 },
  screenTitle: { fontSize: 22, fontFamily: "PlusJakartaSans_700Bold", flex: 1 },
  screenSub: { fontSize: 14, marginBottom: 16 },
  newBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  requestCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  requestTitle: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold", lineHeight: 21 },
  courseCode: { fontSize: 12, marginTop: 4, fontFamily: "PlusJakartaSans_500Medium" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexShrink: 0 },
  statusText: { fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold" },
  requestDesc: { fontSize: 14, lineHeight: 20 },
  adminNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  adminNoteText: { flex: 1, fontSize: 13, lineHeight: 18 },
  requestDate: { fontSize: 12 },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 4 },
  modalTitle: { fontSize: 20, fontFamily: "PlusJakartaSans_700Bold" },
  modalClose: { padding: 4 },
  fieldLabel: { fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", marginBottom: 8 },
  fieldInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  fieldTextarea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 100 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  submitBtnText: { fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
});
