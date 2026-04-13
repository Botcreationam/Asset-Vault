import { useState } from "react";
import { useLocation } from "wouter";
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
import { GraduationCap, BookOpen, Loader2, Sparkles } from "lucide-react";

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

export default function Onboarding() {
  const { user, refetch } = useAuth() as any;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [nickname, setNickname] = useState(
    user?.firstName || user?.username || ""
  );
  const [program, setProgram] = useState("");
  const [customProgram, setCustomProgram] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const finalProgram = program === "Other" ? customProgram.trim() : program;

    if (!nickname.trim() || !finalProgram || !academicYear || !semester) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}api/auth/onboarding`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          program: finalProgram,
          academicYear,
          semester,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save profile");
      }

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
      <div className="hidden lg:flex lg:w-5/12 bg-primary flex-col items-center justify-center p-12 relative overflow-hidden">
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
            Your personalized academic library. Tell us about yourself so we can surface the most relevant resources for your studies.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              { icon: "📚", text: "Browse thousands of curated resources" },
              { icon: "🎯", text: "Content tailored to your program" },
              { icon: "⭐", text: "Rate and review resources" },
              { icon: "💬", text: "Connect with fellow students" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/10"
              >
                <span className="text-xl">{item.icon}</span>
                <p className="text-white/80 text-xs leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-bold">AcadVault</span>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold text-accent uppercase tracking-wider">
                One-time setup
              </span>
            </div>
            <h2 className="font-serif text-3xl font-bold text-foreground mb-2">
              Set up your profile
            </h2>
            <p className="text-muted-foreground">
              Help us personalize AcadVault for your academic journey.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nickname */}
            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-sm font-semibold">
                What should we call you?
              </Label>
              <Input
                id="nickname"
                placeholder="e.g. Alex, Chanda, Dr. Mwale…"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={50}
                className="h-11"
                required
              />
              <p className="text-xs text-muted-foreground">
                This is your display name across the platform.
              </p>
            </div>

            {/* Program */}
            <div className="space-y-2">
              <Label htmlFor="program" className="text-sm font-semibold">
                Course / Programme
              </Label>
              <Select value={program} onValueChange={setProgram} required>
                <SelectTrigger className="h-11" id="program">
                  <SelectValue placeholder="Select your programme…" />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
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
                  required
                />
              )}
            </div>

            {/* Year + Semester row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Academic Year</Label>
                <Select value={academicYear} onValueChange={setAcademicYear} required>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Year…" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y.value} value={y.value}>
                        {y.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Semester</Label>
                <Select value={semester} onValueChange={setSemester} required>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Semester…" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 font-bold text-base gap-2 mt-2"
              disabled={saving}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Setting up your profile…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Enter AcadVault</>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            You can update these details anytime from your account settings.
          </p>
        </div>
      </div>
    </div>
  );
}
