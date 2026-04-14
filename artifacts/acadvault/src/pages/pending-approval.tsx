import { useAuth } from "@workspace/replit-auth-web";
import { BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { GraduationCap, Clock, Mail, MessageCircle, LogOut, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export default function PendingApproval() {
  const { user, refetch } = useAuth();
  const [checking, setChecking] = useState(false);

  // If the user somehow ends up here but is approved, redirect to home
  useEffect(() => {
    if (user && (user as any).approvalStatus === "approved") {
      window.location.href = BASE_URL;
    }
  }, [user]);

  async function checkStatus() {
    setChecking(true);
    try {
      await refetch();
    } finally {
      setChecking(false);
    }
  }

  async function handleLogout() {
    window.location.href = `${BASE_URL}api/logout`;
  }

  const isRejected = (user as any)?.approvalStatus === "rejected";

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-[#142042] border border-white/10 flex items-center justify-center shadow-xl">
            <GraduationCap className="w-6 h-6 text-[#D9A014]" />
          </div>
          <span className="font-serif text-2xl font-bold text-white">AcadVault</span>
        </div>

        {isRejected ? (
          /* Rejected state */
          <div className="bg-[#142042] rounded-2xl border border-red-500/20 p-8 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">❌</span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-white mb-3">Registration not approved</h1>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              Unfortunately, your registration was not approved at this time.
            </p>
            {(user as any)?.rejectionReason && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-left">
                <p className="text-xs font-semibold text-red-400 mb-1">Reason</p>
                <p className="text-white/80 text-sm">{(user as any).rejectionReason}</p>
              </div>
            )}
            <p className="text-white/50 text-sm mb-6">
              If you believe this is an error, please contact our support team via WhatsApp.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href="https://wa.me/260978277538"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Contact Support on WhatsApp
              </a>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-white/10 text-white/60 hover:text-white hover:bg-white/5 gap-2"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </div>
          </div>
        ) : (
          /* Pending state */
          <div className="bg-[#142042] rounded-2xl border border-[#D9A014]/20 p-8 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-[#D9A014]/10 border border-[#D9A014]/20 flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-[#D9A014]" />
            </div>

            <h1 className="font-serif text-2xl font-bold text-white mb-3">
              Account pending review
            </h1>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              Hi <span className="text-white font-semibold">{(user as any)?.nickname || user?.firstName || "there"}</span> 👋 — your registration is in the queue.
              An admin will review your details and approve your account shortly.
            </p>

            {/* Status card */}
            <div className="bg-[#0B1120]/60 rounded-xl border border-white/10 p-5 mb-6 text-left space-y-3">
              {(user as any)?.schoolId && (
                <div className="flex items-start gap-3">
                  <span className="text-lg">🏫</span>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-0.5">Institution</p>
                    <p className="text-white/80 text-sm">{(user as any).schoolId}</p>
                  </div>
                </div>
              )}
              {(user as any)?.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-white/30 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-0.5">Email</p>
                    <p className="text-white/80 text-sm">{(user as any).email}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <span className="text-lg">⏳</span>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-0.5">Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#D9A014] animate-pulse" />
                    <p className="text-[#D9A014] text-sm font-semibold">Awaiting admin approval</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-white/40 text-xs mb-6">
              You'll receive a confirmation email once your account is approved. This usually takes less than 24 hours.
            </p>

            <div className="flex flex-col gap-3">
              <Button
                onClick={checkStatus}
                disabled={checking}
                className="bg-[#D9A014] hover:bg-[#D9A014]/90 text-[#0B1120] font-bold gap-2"
              >
                {checking
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Checking…</>
                  : <><RefreshCw className="w-4 h-4" /> Check approval status</>}
              </Button>
              <a
                href="https://wa.me/260978277538"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border border-white/10 text-white/60 hover:text-white hover:bg-white/5 font-medium py-2.5 px-4 rounded-xl transition-colors text-sm"
              >
                <MessageCircle className="w-4 h-4" /> Contact Support
              </a>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-white/30 hover:text-white/60 gap-2 text-sm"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
