import { useUser, useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

const BASE_URL = import.meta.env.BASE_URL;

interface DbUser {
  id: string;
  role: "student" | "moderator" | "admin";
  username?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  unitsBalance: number;
}

/**
 * Drop-in replacement for the Replit Auth useAuth() hook.
 * Combines Clerk authentication with DB user data (role, username, units).
 */
export function useAuth() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const { data: dbData, isLoading: dbLoading } = useQuery<{ authenticated: boolean; user?: DbUser }>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/auth/user`, { credentials: "include" });
      return res.json();
    },
    enabled: isLoaded && !!isSignedIn,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const isLoading = !isLoaded || (!!isSignedIn && dbLoading && !dbData);
  const isAuthenticated = !!isSignedIn && !!dbData?.authenticated;

  const user = isAuthenticated && clerkUser && dbData?.user
    ? {
        id: dbData.user.id,
        role: dbData.user.role,
        username: dbData.user.username,
        email: dbData.user.email ?? clerkUser.primaryEmailAddress?.emailAddress,
        firstName: dbData.user.firstName ?? clerkUser.firstName,
        lastName: dbData.user.lastName ?? clerkUser.lastName,
        profileImageUrl: dbData.user.profileImageUrl ?? clerkUser.imageUrl,
        unitsBalance: dbData.user.unitsBalance,
      }
    : undefined;

  function login() {
    setLocation("/sign-in");
  }

  async function logout() {
    await signOut();
    setLocation("/");
  }

  return { user, isAuthenticated, isLoading, login, logout };
}
