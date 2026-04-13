import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";

export interface User {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
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
    await WebBrowser.openBrowserAsync(`${BASE}/api/login`);
    await fetchUser();
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
