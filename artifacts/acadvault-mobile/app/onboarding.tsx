import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/AuthContext";

const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const PROGRAMS = [
  "Agriculture", "Architecture", "Biomedical Sciences", "Business Administration",
  "Civil Engineering", "Computer Science", "Dentistry", "Economics", "Education",
  "Electrical Engineering", "Environmental Science", "Human Resource Management",
  "Information Technology", "Law", "Marketing", "Mathematics", "Mechanical Engineering",
  "Media Studies", "Medicine", "Nursing", "Pharmacy", "Psychology", "Public Health",
  "Social Work", "Software Engineering", "Statistics", "Theology", "Tourism & Hospitality", "Other",
];

const YEARS = [
  { value: "1", label: "1st Year" }, { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" }, { value: "4", label: "4th Year" },
  { value: "5", label: "5th Year" }, { value: "6", label: "6th Year" },
  { value: "pg", label: "Postgraduate" },
];

const SEMESTERS = [
  { value: "1", label: "Semester 1" }, { value: "2", label: "Semester 2" },
];

type School = { id: string; name: string; shortName?: string; country: string };

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refetch } = useAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Institution
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [showSchoolList, setShowSchoolList] = useState(false);

  // Step 2: Academic profile
  const [nickname, setNickname] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [customProgram, setCustomProgram] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");

  // Step 3: Verification
  const [institutionalEmail, setInstitutionalEmail] = useState("");
  const [studentIdUri, setStudentIdUri] = useState<string | null>(null);
  const [studentIdUrl, setStudentIdUrl] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState(false);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSchoolSearch(text: string) {
    setSchoolSearch(text);
    setSelectedSchool(null);
    setShowSchoolList(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(text), 200);
  }

  useEffect(() => {
    fetch(`${BASE}/api/schools`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Sort alphabetically client-side
          setSchools([...data].sort((a, b) => a.name.localeCompare(b.name)));
        }
        setLoadingSchools(false);
      })
      .catch(() => setLoadingSchools(false));
  }, []);

  const MAX_VISIBLE = 8;

  // Memoised filtered list based on debounced query
  const filteredSchools = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.name.toLowerCase().startsWith(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.shortName || "").toLowerCase().startsWith(q) ||
        (s.shortName || "").toLowerCase().includes(q)
    );
  }, [schools, debouncedSearch]);


  async function pickStudentId() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setStudentIdUri(asset.uri);
    setUploadingId(true);

    try {
      const formData = new FormData();
      formData.append("image", {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: "student_id.jpg",
      } as any);

      const res = await fetch(`${BASE}/api/auth/student-id-upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setStudentIdUrl(data.url);
      }
    } catch {
      Alert.alert("Upload failed", "Could not upload student ID. You can skip this for now.");
    } finally {
      setUploadingId(false);
    }
  }

  async function handleSubmit() {
    const finalProgram = selectedProgram === "Other" ? customProgram.trim() : selectedProgram;
    if (!nickname.trim() || !finalProgram || !selectedYear || !selectedSemester) {
      Alert.alert("Required fields", "Please fill in all academic profile fields.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        nickname: nickname.trim(),
        program: finalProgram,
        academicYear: selectedYear,
        semester: selectedSemester,
        schoolId: selectedSchool?.id || undefined,
        institutionalEmail: institutionalEmail.trim() || undefined,
        studentIdImageUrl: studentIdUrl || undefined,
      };

      const res = await fetch(`${BASE}/api/auth/onboarding`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save profile");
      }

      await refetch();
      router.replace("/pending-approval");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const stepTitles = ["Select Institution", "Academic Profile", "Verification"];
  const stepDesc = [
    "Choose your university or college.",
    "Tell us about your studies.",
    "Help us verify your enrolment (optional).",
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>📚</Text>
          </View>
          <Text style={styles.logoText}>AcadVault</Text>
        </View>

        {/* Progress */}
        <View style={styles.progressRow}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[styles.progressDot, s <= step ? styles.progressDotActive : styles.progressDotInactive]}
            />
          ))}
        </View>
        <Text style={styles.stepLabel}>Step {step} of 3 — {stepTitles[step - 1]}</Text>
        <Text style={styles.stepDesc}>{stepDesc[step - 1]}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* ── STEP 1: Institution ── */}
        {step === 1 && (
          <View style={styles.section}>
            <Text style={styles.label}>Search your institution</Text>
            <TextInput
              style={styles.input}
              placeholder={loadingSchools ? "Loading institutions..." : "Type to search — e.g. UNZA, CBU..."}
              placeholderTextColor="#64748b"
              editable={!loadingSchools}
              value={showSchoolList ? schoolSearch : (selectedSchool?.name || schoolSearch)}
              onChangeText={handleSchoolSearch}
              onFocus={() => { if (!selectedSchool) setShowSchoolList(true); }}
              autoCorrect={false}
              autoCapitalize="words"
            />

            {showSchoolList && !selectedSchool && (
              <View style={styles.schoolDropdown}>
                {loadingSchools ? (
                  <ActivityIndicator color="#D9A014" style={{ padding: 16 }} />
                ) : (
                  <>
                    {/* Header strip */}
                    <View style={styles.schoolDropdownHeader}>
                      <Text style={styles.schoolDropdownHeaderText}>
                        {debouncedSearch.trim()
                          ? `${filteredSchools.length} result${filteredSchools.length !== 1 ? "s" : ""} for "${debouncedSearch.trim()}"`
                          : `${schools.length} institutions · Zambia`}
                      </Text>
                      {filteredSchools.length > MAX_VISIBLE && (
                        <Text style={styles.schoolDropdownHeaderCount}>
                          Top {MAX_VISIBLE} shown
                        </Text>
                      )}
                    </View>

                    {filteredSchools.length === 0 ? (
                      <Text style={styles.schoolEmpty}>
                        No match for "{debouncedSearch}".{"\n"}
                        <Text style={{ fontSize: 12 }}>Try searching by abbreviation, e.g. "UNZA" or "CBU".</Text>
                      </Text>
                    ) : (
                      filteredSchools.slice(0, MAX_VISIBLE).map((s) => (
                        <TouchableOpacity
                          key={s.id}
                          style={styles.schoolItem}
                          onPress={() => { setSelectedSchool(s); setShowSchoolList(false); setSchoolSearch(""); setDebouncedSearch(""); }}
                        >
                          <View style={styles.schoolItemAvatar}>
                            <Text style={styles.schoolItemAvatarText}>
                              {(s.shortName || s.name).charAt(0)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.schoolItemName}>{s.name}</Text>
                            {s.shortName && (
                              <Text style={styles.schoolItemSub}>{s.shortName} · {s.country}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))
                    )}

                    {filteredSchools.length > MAX_VISIBLE && (
                      <View style={styles.schoolDropdownFooter}>
                        <Text style={styles.schoolDropdownFooterText}>
                          {filteredSchools.length - MAX_VISIBLE} more — keep typing to narrow results
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {selectedSchool && !showSchoolList && (
              <View style={styles.selectedSchool}>
                <Text style={styles.selectedSchoolIcon}>🏫</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedSchoolName}>{selectedSchool.name}</Text>
                  <Text style={styles.selectedSchoolSub}>
                    {selectedSchool.shortName ? `${selectedSchool.shortName} · ` : ""}{selectedSchool.country}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setSelectedSchool(null); setSchoolSearch(""); setDebouncedSearch(""); setShowSchoolList(true); }}>
                  <Text style={styles.selectedSchoolRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.hint}>
              Your institution determines which resources and study groups are available to you.
            </Text>

            <TouchableOpacity
              style={[styles.btn, !selectedSchool && styles.btnDisabled]}
              onPress={() => setStep(2)}
              disabled={!selectedSchool}
            >
              <Text style={styles.btnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 2: Academic Profile ── */}
        {step === 2 && (
          <View style={styles.section}>
            <Text style={styles.label}>Display name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Alex, Chanda…"
              placeholderTextColor="#64748b"
              value={nickname}
              onChangeText={setNickname}
              maxLength={50}
            />

            <Text style={styles.label}>Programme / Course *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {PROGRAMS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, selectedProgram === p && styles.chipSelected]}
                  onPress={() => setSelectedProgram(p)}
                >
                  <Text style={[styles.chipText, selectedProgram === p && styles.chipTextSelected]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {selectedProgram === "Other" && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Enter your programme name"
                placeholderTextColor="#64748b"
                value={customProgram}
                onChangeText={setCustomProgram}
                maxLength={100}
              />
            )}

            <Text style={styles.label}>Academic Year *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {YEARS.map((y) => (
                <TouchableOpacity
                  key={y.value}
                  style={[styles.chip, selectedYear === y.value && styles.chipSelected]}
                  onPress={() => setSelectedYear(y.value)}
                >
                  <Text style={[styles.chipText, selectedYear === y.value && styles.chipTextSelected]}>{y.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Semester *</Text>
            <View style={styles.semesterRow}>
              {SEMESTERS.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.semesterBtn, selectedSemester === s.value && styles.semesterBtnSelected]}
                  onPress={() => setSelectedSemester(s.value)}
                >
                  <Text style={[styles.semesterBtnText, selectedSemester === s.value && styles.semesterBtnTextSelected]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowBtns}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline, { flex: 1, marginRight: 8 }]} onPress={() => setStep(1)}>
                <Text style={styles.btnOutlineText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { flex: 2 }, (!nickname.trim() || !selectedProgram || !selectedYear || !selectedSemester) && styles.btnDisabled]}
                onPress={() => setStep(3)}
                disabled={!nickname.trim() || !selectedProgram || !selectedYear || !selectedSemester}
              >
                <Text style={styles.btnText}>Continue →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── STEP 3: Verification ── */}
        {step === 3 && (
          <View style={styles.section}>
            <Text style={styles.label}>Institutional email <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="you@university.ac.zm"
              placeholderTextColor="#64748b"
              value={institutionalEmail}
              onChangeText={setInstitutionalEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Student ID photo <Text style={styles.optional}>(optional)</Text></Text>
            <TouchableOpacity style={styles.idUpload} onPress={pickStudentId} disabled={uploadingId}>
              {studentIdUri ? (
                <View>
                  <Image source={{ uri: studentIdUri }} style={styles.idPreview} resizeMode="cover" />
                  {uploadingId && (
                    <View style={styles.idOverlay}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.idOverlayText}>Uploading…</Text>
                    </View>
                  )}
                  {!uploadingId && studentIdUrl && (
                    <View style={styles.idOverlay}>
                      <Text style={styles.idOverlayText}>✓ Uploaded</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.idPlaceholder}>
                  <Text style={styles.idPlaceholderIcon}>📷</Text>
                  <Text style={styles.idPlaceholderText}>Tap to upload student ID photo</Text>
                  <Text style={styles.idPlaceholderSub}>JPEG or PNG · Max 5MB</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>What happens next?</Text>
              <Text style={styles.infoBoxText}>
                An admin will review your registration and approve your account. Once approved, you'll get full access to all resources at{" "}
                <Text style={{ color: "#D9A014", fontWeight: "700" }}>{selectedSchool?.name || "your institution"}</Text>.
              </Text>
            </View>

            <View style={styles.rowBtns}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline, { flex: 1, marginRight: 8 }]} onPress={() => setStep(2)}>
                <Text style={styles.btnOutlineText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { flex: 2 }, (saving || uploadingId) && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={saving || uploadingId}
              >
                {saving ? (
                  <ActivityIndicator color="#0B1120" />
                ) : (
                  <Text style={styles.btnText}>Submit for review ✓</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              Institutional email and student ID are optional but help speed up your approval.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1120" },
  header: { backgroundColor: "#142042", paddingHorizontal: 24, paddingBottom: 24 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16, marginTop: 8 },
  logoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  logoIconText: { fontSize: 18 },
  logoText: { fontSize: 20, fontWeight: "700", color: "#fff", fontFamily: "PlusJakartaSans_700Bold" },
  progressRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  progressDot: { flex: 1, height: 4, borderRadius: 2 },
  progressDotActive: { backgroundColor: "#D9A014" },
  progressDotInactive: { backgroundColor: "rgba(255,255,255,0.15)" },
  stepLabel: { fontSize: 13, fontWeight: "700", color: "#D9A014", letterSpacing: 0.5, fontFamily: "PlusJakartaSans_700Bold" },
  stepDesc: { fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 2, fontFamily: "PlusJakartaSans_400Regular" },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 24, paddingTop: 24, gap: 4 },
  label: { fontSize: 13, fontWeight: "700", color: "#94a3b8", marginTop: 16, marginBottom: 6, fontFamily: "PlusJakartaSans_700Bold", letterSpacing: 0.3 },
  optional: { fontSize: 11, color: "#64748b", fontWeight: "400" },
  input: { backgroundColor: "#1e2d4a", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#f1f5f9", fontSize: 15, fontFamily: "PlusJakartaSans_400Regular" },
  schoolDropdown: { backgroundColor: "#1a2a42", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, marginTop: 4, overflow: "hidden" },
  schoolDropdownHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.04)", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  schoolDropdownHeaderText: { fontSize: 11, color: "#64748b", fontFamily: "PlusJakartaSans_400Regular" },
  schoolDropdownHeaderCount: { fontSize: 11, color: "#D9A014", fontFamily: "PlusJakartaSans_600SemiBold" },
  schoolDropdownFooter: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.04)", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", alignItems: "center" },
  schoolDropdownFooterText: { fontSize: 11, color: "#64748b", fontFamily: "PlusJakartaSans_400Regular" },
  schoolItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)", flexDirection: "row", alignItems: "center", gap: 10 },
  schoolItemAvatar: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#142042", alignItems: "center", justifyContent: "center" },
  schoolItemAvatarText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.7)", fontFamily: "PlusJakartaSans_700Bold" },
  schoolItemName: { fontSize: 14, fontWeight: "600", color: "#f1f5f9", fontFamily: "PlusJakartaSans_600SemiBold" },
  schoolItemSub: { fontSize: 12, color: "#64748b", marginTop: 2, fontFamily: "PlusJakartaSans_400Regular" },
  schoolEmpty: { padding: 16, color: "#64748b", fontSize: 13, textAlign: "center", fontFamily: "PlusJakartaSans_400Regular", lineHeight: 20 },
  selectedSchool: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(217,160,20,0.1)", borderWidth: 1, borderColor: "rgba(217,160,20,0.3)", borderRadius: 12, padding: 14, marginTop: 8 },
  selectedSchoolIcon: { fontSize: 22 },
  selectedSchoolName: { fontSize: 14, fontWeight: "700", color: "#f1f5f9", fontFamily: "PlusJakartaSans_700Bold" },
  selectedSchoolSub: { fontSize: 12, color: "#64748b", fontFamily: "PlusJakartaSans_400Regular" },
  selectedSchoolRemove: { color: "#64748b", fontSize: 18, paddingLeft: 8 },
  hint: { fontSize: 12, color: "#475569", marginTop: 10, lineHeight: 18, fontFamily: "PlusJakartaSans_400Regular" },
  btn: { backgroundColor: "#D9A014", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 20 },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 15, fontWeight: "700", color: "#0B1120", fontFamily: "PlusJakartaSans_700Bold" },
  btnOutline: { backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  btnOutlineText: { fontSize: 15, fontWeight: "600", color: "#94a3b8", fontFamily: "PlusJakartaSans_600SemiBold" },
  rowBtns: { flexDirection: "row", marginTop: 20 },
  chipScroll: { marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginRight: 8, marginBottom: 4 },
  chipSelected: { backgroundColor: "rgba(217,160,20,0.2)", borderColor: "#D9A014" },
  chipText: { fontSize: 13, color: "#94a3b8", fontFamily: "PlusJakartaSans_500Medium" },
  chipTextSelected: { color: "#D9A014", fontWeight: "700" },
  semesterRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  semesterBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center" },
  semesterBtnSelected: { backgroundColor: "rgba(217,160,20,0.2)", borderColor: "#D9A014" },
  semesterBtnText: { fontSize: 14, color: "#94a3b8", fontFamily: "PlusJakartaSans_500Medium" },
  semesterBtnTextSelected: { color: "#D9A014", fontWeight: "700" },
  idUpload: { borderRadius: 12, overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.1)", borderStyle: "dashed", marginTop: 4 },
  idPreview: { width: "100%", height: 140 },
  idOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.6)", padding: 10, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  idOverlayText: { color: "#fff", fontSize: 13, fontFamily: "PlusJakartaSans_600SemiBold" },
  idPlaceholder: { paddingVertical: 32, alignItems: "center", gap: 6 },
  idPlaceholderIcon: { fontSize: 32 },
  idPlaceholderText: { fontSize: 14, color: "#64748b", fontFamily: "PlusJakartaSans_500Medium" },
  idPlaceholderSub: { fontSize: 12, color: "#475569", fontFamily: "PlusJakartaSans_400Regular" },
  infoBox: { backgroundColor: "rgba(20,32,66,0.7)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 16, marginTop: 16 },
  infoBoxTitle: { fontSize: 13, fontWeight: "700", color: "#f1f5f9", fontFamily: "PlusJakartaSans_700Bold", marginBottom: 6 },
  infoBoxText: { fontSize: 13, color: "#94a3b8", lineHeight: 20, fontFamily: "PlusJakartaSans_400Regular" },
});
