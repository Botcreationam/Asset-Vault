import { useState, useEffect, useCallback } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  refetch: () => Promise<void>;
}

// Global state for showing the login modal — components listen via custom events.
const AUTH_MODAL_EVENT = "acadvault:show-auth-modal";

export function triggerAuthModal() {
  window.dispatchEvent(new CustomEvent(AUTH_MODAL_EVENT));
}

export function useAuthModalTrigger(onOpen: () => void) {
  useEffect(() => {
    const handler = () => onOpen();
    window.addEventListener(AUTH_MODAL_EVENT, handler);
    return () => window.removeEventListener(AUTH_MODAL_EVENT, handler);
  }, [onOpen]);
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json() as { authenticated: boolean; user?: AuthUser };
      setUser(data.authenticated && data.user ? data.user : null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(() => {
    triggerAuthModal();
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    setUser(null);
    window.location.href = "/";
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refetch: fetchUser,
  };
}
