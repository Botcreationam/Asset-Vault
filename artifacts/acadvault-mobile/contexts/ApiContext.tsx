import React, { createContext, useContext } from "react";

const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface ApiContextType {
  baseUrl: string;
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

const ApiContext = createContext<ApiContextType>({
  baseUrl: BASE,
  apiFetch: async () => new Response(),
});

export function useApi() {
  return useContext(ApiContext);
}

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        errMsg = body?.error || body?.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    return res;
  };

  return (
    <ApiContext.Provider value={{ baseUrl: BASE, apiFetch }}>
      {children}
    </ApiContext.Provider>
  );
}
