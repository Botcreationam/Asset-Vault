import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

export interface User {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  profileImageUrl?: string;
  role: "student" | "moderator" | "admin";
  unitsBalance: number;
  nickname?: string | null;
  program?: string | null;
  academicYear?: string | null;
  semester?: string | null;
  onboardingCompleted?: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  trialEndsAt: string;
  // Multi-school & approval
  schoolId?: string | null;
  institutionalEmail?: string | null;
  approvalStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  refetch: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/auth/user`, { credentials: "include" });
      if (!res.ok) { setUser(null); return; }
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = useCallback(async () => {
    try {
      // The deep link URL that Expo listens for. When the server redirects to this, the
      // browser (ASWebAuthenticationSession on iOS) closes automatically.
      const redirectUrl = Linking.createURL("/");
      const loginUrl = `${BASE}/api/login?mobileReturnTo=${encodeURIComponent(redirectUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUrl);

      // On success the server embeds a one-time exchange token in the deep link URL.
      // We trade it for a real session cookie via a normal fetch so that iOS's regular
      // HTTP stack (NSURLSession) picks it up — ASWebAuthenticationSession has its own
      // isolated cookie jar that fetch/axios cannot access.
      if (result.type === "success" && result.url) {
        const parsed = Linking.parse(result.url);
        const token = parsed.queryParams?.token;
        if (token) {
          await fetch(`${BASE}/api/auth/exchange?token=${token}`, {
            credentials: "include",
          });
        }
      }
    } catch {
      // Ignore — user may have cancelled or dismissed the browser
    } finally {
      // Always re-check session state regardless of outcome
      await fetchUser();
    }
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try { await fetch(`${BASE}/api/logout`, { credentials: "include" }); } catch {}
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, refetch: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}
