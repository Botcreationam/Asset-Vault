import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/contexts/ApiContext";
import { useRouter, type Href } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

const isWeb = Platform.OS === "web";

function InfoRow({ icon, label, value, colors }: { icon: string; label: string; value?: string | null; colors: any }) {
  if (!value) return null;
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Ionicons name={icon as any} size={16} color={colors.mutedForeground} />
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function QuickLink({ icon, label, sub, onPress, colors }: { icon: string; label: string; sub?: string; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity
      style={[styles.quickLink, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.quickLinkIcon, { backgroundColor: colors.muted }]}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.quickLinkLabel, { color: colors.foreground }]}>{label}</Text>
        {sub && <Text style={[styles.quickLinkSub, { color: colors.mutedForeground }]}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

function EditProfileModal({ user, visible, onClose, onSave }: {
  user: any;
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [program, setProgram] = useState(user?.program || "");
  const [academicYear, setAcademicYear] = useState(user?.academicYear || "");
  const [semester, setSemester] = useState(user?.semester || "");

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top || 20 }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
            {[
              { label: "First Name", value: firstName, set: setFirstName, placeholder: "Your first name" },
              { label: "Last Name", value: lastName, set: setLastName, placeholder: "Your last name" },
              { label: "Display Name", value: nickname, set: setNickname, placeholder: "How you appear to others" },
              { label: "Program / Course", value: program, set: setProgram, placeholder: "E.g. Computer Science" },
              { label: "Academic Year", value: academicYear, set: setAcademicYear, placeholder: "E.g. 2" },
              { label: "Semester", value: semester, set: setSemester, placeholder: "E.g. 1" },
            ].map(({ label, value, set, placeholder }) => (
              <View key={label}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                  value={value}
                  onChangeText={set}
                  placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: "#142042" }]}
              onPress={() => onSave({ firstName, lastName, nickname, program, academicYear, semester })}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function AccountScreen() {
  const colors = useColors();
  const { user, isAuthenticated, isLoading, login, logout, refetch: refetchAuth } = useAuth();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: txData, refetch: refetchTx } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await apiFetch("/api/units/transactions");
      return res.json();
    },
    enabled: isAuthenticated,
  });


  const updateProfileMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      refetchAuth();
      setEditOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: Error) => {
      Alert.alert("Update Failed", err.message);
    },
  });

  const uploadAvatarMut = useMutation({
    mutationFn: async (uri: string) => {
      const formData = new FormData();
      const name = uri.split("/").pop() || "avatar.jpg";
      (formData as any).append("file", { uri, name, type: "image/jpeg" });
      const res = await apiFetch("/api/auth/profile-photo", {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: formData,
      });
      return res.json();
    },
    onSuccess: () => {
      refetchAuth();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: Error) => {
      Alert.alert("Upload Failed", err.message);
    },
  });

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library to update your profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      uploadAvatarMut.mutate(result.assets[0].uri);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchAuth(), refetchTx()]);
    setRefreshing(false);
  };

  const transactions = txData?.transactions || [];
  const downloads = transactions.filter((tx: any) => tx.type === "debit");

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
        <Ionicons name="person-circle" size={64} color={colors.primary} style={{ opacity: 0.4 }} />
        <Text style={[styles.authTitle, { color: colors.foreground }]}>Your Account</Text>
        <Text style={[styles.authMessage, { color: colors.mutedForeground }]}>
          Sign in to view your profile, balance, and downloads
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

  const displayName = user?.nickname || user?.firstName || user?.username || "Student";
  const roleLabel = user?.role === "admin" ? "Admin" : user?.role === "moderator" ? "Moderator" : "Student";
  const roleColor = user?.role === "admin" ? "#D9A014" : user?.role === "moderator" ? "#8B5CF6" : "#22C55E";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: isWeb ? 67 : insets.top + 8, paddingBottom: 110 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* ── Profile hero card ──────────────────────────────────────────── */}
      <LinearGradient
        colors={["#142042", "#1e3a6e"]}
        style={styles.profileHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroInner}>
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8} style={styles.avatarWrapper}>
            {uploadAvatarMut.isPending ? (
              <View style={[styles.avatarPlaceholder, { borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" }]}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : user?.profileImageUrl ? (
              <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{displayName[0].toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName} numberOfLines={1}>{displayName}</Text>
            {user?.username && user?.nickname && (
              <Text style={styles.heroUsername}>@{user.username}</Text>
            )}
            <View style={[styles.rolePill, { backgroundColor: roleColor + "25" }]}>
              <Text style={[styles.roleText, { color: roleColor }]}>{roleLabel}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditOpen(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="pencil" size={16} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Trial status card ──────────────────────────────────────────── */}
      {user?.isTrialActive ? (
        <View style={[styles.trialCard, { backgroundColor: "#78350F18", borderColor: "#D97706" }]}>
          <View style={styles.trialHeader}>
            <Ionicons name="gift" size={20} color="#D97706" />
            <Text style={[styles.trialTitle, { color: "#D97706" }]}>Free Trial Active</Text>
            <View style={[styles.trialBadge]}>
              <Text style={styles.trialBadgeText}>{user.trialDaysRemaining}d left</Text>
            </View>
          </View>
          <Text style={[styles.trialSub, { color: colors.mutedForeground }]}>
            All downloads are free until {new Date(user.trialEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        </View>
      ) : user && !user.isTrialActive && user.trialDaysRemaining === 0 ? (
        <View style={[styles.trialCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <View style={styles.trialHeader}>
            <Ionicons name="time" size={18} color={colors.mutedForeground} />
            <Text style={[styles.trialTitle, { color: colors.mutedForeground }]}>Trial Ended</Text>
          </View>
          <Text style={[styles.trialSub, { color: colors.mutedForeground }]}>
            Purchase units to continue downloading resources.
          </Text>
        </View>
      ) : null}

      {/* ── Units balance ──────────────────────────────────────────────── */}
      <View style={[styles.balanceCard, { backgroundColor: "#142042" }]}>
        <View style={styles.balanceTop}>
          <View>
            <Text style={styles.balanceLabel}>Unit Balance</Text>
            <Text style={styles.balanceAmount}>{user?.unitsBalance ?? 0}</Text>
          </View>
          <View style={styles.balanceIcon}>
            <Ionicons name="flash" size={28} color="#D9A014" />
          </View>
        </View>
        <Text style={styles.balanceSub}>units available for downloads</Text>
      </View>

      {/* ── Quick links ────────────────────────────────────────────────── */}
      <View style={{ gap: 8 }}>
        <QuickLink
          icon="bookmark"
          label="Saved Resources"
          sub="Your bookmarked files"
          onPress={() => router.push("/(tabs)/bookmarks" as Href)}
          colors={colors}
        />
        <QuickLink
          icon="document-text"
          label="Material Requests"
          sub="Request resources you need"
          onPress={() => router.push("/material-requests" as Href)}
          colors={colors}
        />
      </View>

      {/* ── Academic profile ───────────────────────────────────────────── */}
      {(user?.program || user?.academicYear || user?.semester) && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Academic Profile</Text>
            <TouchableOpacity onPress={() => setEditOpen(true)} activeOpacity={0.7}>
              <Ionicons name="pencil" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <InfoRow icon="school" label="Program" value={user.program} colors={colors} />
          <InfoRow icon="calendar" label="Year" value={user.academicYear} colors={colors} />
          <InfoRow icon="bookmark" label="Semester" value={user.semester} colors={colors} />
        </View>
      )}

      {/* ── Download history (debit transactions) ─────────────────────── */}
      {downloads.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Download History</Text>
          {downloads.slice(0, 10).map((d: any) => (
            <View key={d.id} style={[styles.downloadRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.dlIcon, { backgroundColor: "#142042" + "15" }]}>
                <Ionicons name="download" size={15} color="#142042" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dlName, { color: colors.foreground }]} numberOfLines={1}>
                  {d.description?.replace(/^Downloaded:\s*/i, "") || "Resource"}
                </Text>
                <Text style={[styles.dlDate, { color: colors.mutedForeground }]}>
                  {new Date(d.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: "#EF4444" }]}>-{d.amount}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Transaction history ────────────────────────────────────────── */}
      {transactions.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Transaction History</Text>
          {transactions.slice(0, 15).map((tx: any) => (
            <View key={tx.id} style={[styles.txRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.txIcon, {
                backgroundColor: tx.type === "credit" ? "#22C55E20" : "#EF444420",
              }]}>
                <Ionicons
                  name={tx.type === "credit" ? "arrow-down" : "arrow-up"}
                  size={15}
                  color={tx.type === "credit" ? "#22C55E" : "#EF4444"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txDesc, { color: colors.foreground }]} numberOfLines={2}>
                  {tx.description}
                </Text>
                <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
                  {new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === "credit" ? "#22C55E" : "#EF4444" }]}>
                {tx.type === "credit" ? "+" : "-"}{tx.amount}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Sign out ───────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.logoutButton, { borderColor: colors.destructive }]}
        onPress={logout}
        activeOpacity={0.75}
      >
        <Ionicons name="log-out" size={18} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
      </TouchableOpacity>

      <EditProfileModal
        user={user}
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={(data) => updateProfileMut.mutate(data)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 40 },
  authTitle: { fontSize: 24, fontFamily: "PlusJakartaSans_700Bold" },
  authMessage: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  loginButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 6 },
  loginText: { color: "#fff", fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
  content: { padding: 16, gap: 14 },
  profileHero: { borderRadius: 18, overflow: "hidden" },
  heroInner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 20 },
  avatarWrapper: { position: "relative" },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#fff", fontSize: 26, fontFamily: "PlusJakartaSans_700Bold" },
  cameraOverlay: {
    position: "absolute", bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#142042", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  heroName: { color: "#fff", fontSize: 20, fontFamily: "PlusJakartaSans_700Bold" },
  heroUsername: { color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 2 },
  rolePill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
  roleText: { fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold" },
  editBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  trialCard: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },
  trialHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  trialTitle: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold", flex: 1 },
  trialBadge: { backgroundColor: "#D97706", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  trialBadgeText: { color: "#fff", fontSize: 11, fontFamily: "PlusJakartaSans_700Bold" },
  trialSub: { fontSize: 13, lineHeight: 18 },
  balanceCard: { borderRadius: 16, padding: 20, gap: 4 },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  balanceLabel: { color: "rgba(255,255,255,0.6)", fontSize: 13 },
  balanceAmount: { color: "#fff", fontSize: 44, fontFamily: "PlusJakartaSans_700Bold", lineHeight: 50 },
  balanceIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(217,160,20,0.2)", alignItems: "center", justifyContent: "center" },
  balanceSub: { color: "rgba(255,255,255,0.45)", fontSize: 12 },
  quickLink: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  quickLinkIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickLinkLabel: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold" },
  quickLinkSub: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardTitle: { fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  infoLabel: { fontSize: 13, width: 68 },
  infoValue: { flex: 1, fontSize: 14, fontFamily: "PlusJakartaSans_500Medium" },
  downloadRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  dlIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dlName: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium" },
  dlDate: { fontSize: 12, marginTop: 2 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  txIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  txDesc: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium" },
  txDate: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5 },
  logoutText: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold" },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 4 },
  modalTitle: { fontSize: 20, fontFamily: "PlusJakartaSans_700Bold" },
  fieldLabel: { fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", marginBottom: 8 },
  fieldInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "PlusJakartaSans_600SemiBold" },
});
