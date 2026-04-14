import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  BookOpen,
  Loader2,
  Sparkles,
  Building2,
  Mail,
  ImagePlus,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const PROGRAMS = [
  "Agriculture",
  "Architecture",
  "Biomedical Sciences",
  "Business Administration",
  "Civil Engineering",
  "Computer Science",
  "Dentistry",
  "Economics",
  "Education",
  "Electrical Engineering",
  "Environmental Science",
  "Human Resource Management",
  "Information Technology",
  "Law",
  "Marketing",
  "Mathematics",
  "Mechanical Engineering",
  "Media Studies",
  "Medicine",
  "Nursing",
  "Pharmacy",
  "Psychology",
  "Public Health",
  "Social Work",
  "Software Engineering",
  "Statistics",
  "Theology",
  "Tourism & Hospitality",
  "Other",
];

const YEARS = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
  { value: "5", label: "5th Year" },
  { value: "6", label: "6th Year" },
  { value: "pg", label: "Postgraduate" },
];

const SEMESTERS = [
  { value: "1", label: "Semester 1" },
  { value: "2", label: "Semester 2" },
];

type School = { id: string; name: string; shortName?: string; country: string };

const STEPS = [
  { id: 1, label: "Institution", icon: Building2 },
  { id: 2, label: "Academic Profile", icon: GraduationCap },
  { id: 3, label: "Verification", icon: CheckCircle2 },
];

export default function Onboarding() {
  const { user, refetch } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Institution
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce the search so filtering runs 200ms after the user stops typing
  const debouncedSearch = useDebounce(schoolSearch, 200);

  // Step 2: Academic profile
  const [nickname, setNickname] = useState(user?.firstName || user?.username || "");
  const [program, setProgram] = useState("");
  const [customProgram, setCustomProgram] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("");

  // Step 3: Verification
  const [institutionalEmail, setInstitutionalEmail] = useState("");
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
  const [studentIdPreview, setStudentIdPreview] = useState<string | null>(null);
  const [studentIdUrl, setStudentIdUrl] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load all schools once on mount — alphabetically ordered from server
  useEffect(() => {
    setSchoolsLoading(true);
    fetch(`${BASE_URL}api/schools`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Ensure alphabetical order client-side too
          setSchools(data.sort((a, b) => a.name.localeCompare(b.name)));
        }
      })
      .catch(() => {})
      .finally(() => setSchoolsLoading(false));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Memoised filter — runs against the debounced query
  const filteredSchools = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return schools; // show all when nothing typed
    return schools.filter(
      (s) =>
        s.name.toLowerCase().startsWith(q) ||          // prefix match first (fastest UX)
        s.name.toLowerCase().includes(q) ||            // substring match
        (s.shortName || "").toLowerCase().startsWith(q) ||
        (s.shortName || "").toLowerCase().includes(q)
    );
  }, [schools, debouncedSearch]);

  const MAX_VISIBLE = 8;

  async function uploadStudentId(file: File) {
    setUploadingId(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${BASE_URL}api/auth/student-id-upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setStudentIdUrl(data.url);
    } catch {
      toast({ title: "Failed to upload ID image", variant: "destructive" });
    } finally {
      setUploadingId(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }
    setStudentIdFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setStudentIdPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    uploadStudentId(file);
  }

  function canAdvanceStep1() {
    return !!selectedSchool;
  }

  function canAdvanceStep2() {
    const finalProgram = program === "Other" ? customProgram.trim() : program;
    return nickname.trim().length >= 2 && finalProgram && academicYear && semester;
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const finalProgram = program === "Other" ? customProgram.trim() : program;
      const body: Record<string, any> = {
        nickname: nickname.trim(),
        program: finalProgram,
        academicYear,
        semester,
        schoolId: selectedSchool?.id || undefined,
        institutionalEmail: institutionalEmail.trim() || undefined,
        studentIdImageUrl: studentIdUrl || undefined,
      };

      const res = await fetch(`${BASE_URL}api/auth/onboarding`, {
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
      window.location.href = import.meta.env.BASE_URL || "/";
    } catch (err: any) {
      toast({ title: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#142042] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-accent/30 blur-3xl" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-8 shadow-xl">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-serif text-4xl font-bold text-white mb-4 leading-tight">
            Welcome to AcadVault
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-sm">
            Your personalized academic library. Let's get your profile set up so we can connect you with the right resources for your institution.
          </p>
          {/* Steps indicator */}
          <div className="mt-10 space-y-3 text-left">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const active = s.id === step;
              const done = s.id < step;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-4 rounded-xl p-4 border transition-all",
                    active
                      ? "bg-white/10 border-white/20 text-white"
                      : done
                      ? "bg-accent/20 border-accent/30 text-accent"
                      : "bg-white/5 border-white/10 text-white/40"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", active ? "bg-accent text-[#0B1120]" : done ? "bg-accent/30" : "bg-white/10")}>
                    {done ? <CheckCircle2 className="w-4 h-4 text-accent" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="font-semibold text-sm">{s.label}</span>
                  {active && <span className="ml-auto text-xs text-accent font-bold">CURRENT</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-[#142042] flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-serif text-xl font-bold">AcadVault</span>
          </div>

          {/* Mobile step indicator */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all",
                  s.id <= step ? "bg-accent" : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* ── STEP 1: Institution ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-accent" />
                  <span className="text-sm font-semibold text-accent uppercase tracking-wider">Step 1 of 3</span>
                </div>
                <h2 className="font-serif text-3xl font-bold text-foreground mb-2">Select your institution</h2>
                <p className="text-muted-foreground text-sm">
                  Choose the university, college, or school you're currently enrolled at.
                </p>
              </div>

              {/* School search */}
              <div className="relative" ref={dropdownRef}>
                <Label className="text-sm font-semibold mb-2 block">Institution</Label>
                <div className="relative">
                  {schoolsLoading
                    ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                    : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  }
                  <Input
                    ref={searchInputRef}
                    placeholder={schoolsLoading ? "Loading institutions..." : "Type to search — e.g. University, CBU..."}
                    value={selectedSchool ? selectedSchool.name : schoolSearch}
                    disabled={schoolsLoading}
                    onChange={(e) => {
                      setSelectedSchool(null);
                      setSchoolSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => { if (!selectedSchool) setShowDropdown(true); }}
                    className="h-11 pl-10 pr-10"
                    autoComplete="off"
                  />
                  {selectedSchool && (
                    <button
                      onClick={() => {
                        setSelectedSchool(null);
                        setSchoolSearch("");
                        setShowDropdown(true);
                        setTimeout(() => searchInputRef.current?.focus(), 0);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {showDropdown && !selectedSchool && !schoolsLoading && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                    {/* Header strip */}
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border/60">
                      <span className="text-xs text-muted-foreground font-medium">
                        {debouncedSearch.trim()
                          ? `${filteredSchools.length} result${filteredSchools.length !== 1 ? "s" : ""} for "${debouncedSearch.trim()}"`
                          : `${schools.length} institutions · Zambia`}
                      </span>
                      {filteredSchools.length > MAX_VISIBLE && (
                        <span className="text-xs text-accent font-semibold">
                          Showing {MAX_VISIBLE} of {filteredSchools.length}
                        </span>
                      )}
                    </div>

                    <div className="max-h-56 overflow-y-auto">
                      {filteredSchools.length === 0 ? (
                        <div className="p-5 text-sm text-muted-foreground text-center">
                          <Search className="w-6 h-6 mx-auto mb-2 opacity-30" />
                          No institution matched "<span className="font-semibold">{debouncedSearch}</span>".
                          <br />
                          <span className="text-xs">Try searching by abbreviation, e.g. "UNZA" or "CBU".</span>
                        </div>
                      ) : (
                        filteredSchools.slice(0, MAX_VISIBLE).map((s, i) => (
                          <button
                            key={s.id}
                            className="w-full text-left px-4 py-3 hover:bg-accent/8 active:bg-accent/15 transition-colors border-b border-border/40 last:border-0 flex items-center gap-3 group"
                            onClick={() => {
                              setSelectedSchool(s);
                              setSchoolSearch("");
                              setShowDropdown(false);
                            }}
                          >
                            <div className="w-7 h-7 rounded-md bg-[#142042] flex items-center justify-center shrink-0 text-[10px] font-bold text-white/70 group-hover:text-white transition-colors">
                              {s.shortName ? s.shortName.charAt(0) : s.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">{s.name}</div>
                              {s.shortName && (
                                <div className="text-xs text-muted-foreground">{s.shortName} · {s.country}</div>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </button>
                        ))
                      )}
                    </div>

                    {filteredSchools.length > MAX_VISIBLE && (
                      <div className="px-4 py-2.5 bg-muted/30 border-t border-border/60 text-center">
                        <span className="text-xs text-muted-foreground">
                          {filteredSchools.length - MAX_VISIBLE} more — keep typing to narrow results
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {selectedSchool && (
                  <div className="mt-3 flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-xl p-3">
                    <div className="w-9 h-9 rounded-lg bg-[#142042] flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{selectedSchool.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedSchool.shortName && `${selectedSchool.shortName} · `}{selectedSchool.country}
                      </p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                Your institution determines which academic resources and study groups are available to you. Resources are organised by institution to keep them relevant.
              </p>

              <Button
                size="lg"
                className="w-full h-12 font-bold text-base gap-2"
                onClick={() => setStep(2)}
                disabled={!canAdvanceStep1()}
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* ── STEP 2: Academic Profile ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-5 h-5 text-accent" />
                  <span className="text-sm font-semibold text-accent uppercase tracking-wider">Step 2 of 3</span>
                </div>
                <h2 className="font-serif text-3xl font-bold text-foreground mb-2">Your academic profile</h2>
                <p className="text-muted-foreground text-sm">
                  Help us personalise your experience with your study details.
                </p>
              </div>

              {/* Nickname */}
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-sm font-semibold">Display name</Label>
                <Input
                  id="nickname"
                  placeholder="e.g. Alex, Chanda, Dr. Mwale…"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={50}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">This is how other students will see you.</p>
              </div>

              {/* Program */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Course / Programme</Label>
                <Select value={program} onValueChange={setProgram}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select your programme…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAMS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {program === "Other" && (
                  <Input
                    placeholder="Enter your programme name"
                    value={customProgram}
                    onChange={(e) => setCustomProgram(e.target.value)}
                    maxLength={100}
                    className="h-11 mt-2"
                  />
                )}
              </div>

              {/* Year + Semester */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Academic Year</Label>
                  <Select value={academicYear} onValueChange={setAcademicYear}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Year…" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Semester</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Semester…" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMESTERS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="lg" className="h-12 gap-2" onClick={() => setStep(1)}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  size="lg"
                  className="flex-1 h-12 font-bold text-base gap-2"
                  onClick={() => setStep(3)}
                  disabled={!canAdvanceStep2()}
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Verification ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                  <span className="text-sm font-semibold text-accent uppercase tracking-wider">Step 3 of 3</span>
                </div>
                <h2 className="font-serif text-3xl font-bold text-foreground mb-2">Verify your enrolment</h2>
                <p className="text-muted-foreground text-sm">
                  An admin will review your details before granting full access. This keeps the platform secure and trustworthy.
                </p>
              </div>

              {/* Institutional email */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-accent" /> Institutional email
                  <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  type="email"
                  placeholder="you@university.ac.zm"
                  value={institutionalEmail}
                  onChange={(e) => setInstitutionalEmail(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Your official student or institutional email address (if different from your login email).
                </p>
              </div>

              {/* Student ID upload */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <ImagePlus className="w-4 h-4 text-accent" /> Student ID photo
                  <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {studentIdPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <img src={studentIdPreview} alt="Student ID" className="w-full h-40 object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-end p-3">
                      <div className="flex items-center gap-2">
                        {uploadingId ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : studentIdUrl ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : null}
                        <span className="text-white text-xs font-semibold">
                          {uploadingId ? "Uploading…" : studentIdUrl ? "Uploaded" : "Processing…"}
                        </span>
                        <button
                          className="ml-auto bg-white/20 hover:bg-white/30 rounded px-2 py-1 text-white text-xs"
                          onClick={() => { setStudentIdFile(null); setStudentIdPreview(null); setStudentIdUrl(null); }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-accent/50 hover:bg-accent/5 transition-all text-muted-foreground"
                  >
                    <ImagePlus className="w-8 h-8" />
                    <span className="text-sm font-medium">Click to upload your student ID</span>
                    <span className="text-xs">JPEG, PNG or WebP · Max 5MB</span>
                  </button>
                )}
                <p className="text-xs text-muted-foreground">
                  A photo of your student card helps admins verify your enrolment quickly. This is kept private and only visible to admins.
                </p>
              </div>

              <div className="bg-[#142042]/40 border border-[#142042]/60 rounded-xl p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">What happens next?</span><br />
                  After submitting, an admin will review your details. Once approved, you'll get full access to all resources at{" "}
                  <span className="text-accent font-semibold">{selectedSchool?.name || "your institution"}</span>.
                  You'll be notified by email when your account is approved.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="h-12 gap-2" onClick={() => setStep(2)}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  size="lg"
                  className="flex-1 h-12 font-bold text-base gap-2"
                  onClick={handleSubmit}
                  disabled={saving || uploadingId}
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Submit for review</>
                  )}
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Institutional email and student ID are optional but help speed up approval.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
