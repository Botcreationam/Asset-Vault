export const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "") + "/";

/**
 * Drop-in replacement for `fetch` that automatically attaches the Clerk
 * Bearer token to all requests.  Uses the token getter registered by
 * ClerkAuthSync (via setAuthTokenGetter).  Falls back to cookie-only if no
 * token is available.
 *
 * Import:  import { authFetch, BASE_URL } from "@/lib/api";
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  let token: string | null = null;
  try {
    const { getAuthToken } = await import("@workspace/api-client-react");
    token = await getAuthToken();
  } catch {
    token = null;
  }

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, { credentials: "include", ...init, headers });
}
