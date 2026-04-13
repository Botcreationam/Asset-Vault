export const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "") + "/";

/**
 * Drop-in replacement for `fetch` that always sends session cookies.
 * Replit Auth uses cookie-based sessions so we just need credentials: "include".
 *
 * Import:  import { authFetch, BASE_URL } from "@/lib/api";
 */
export function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(input, { credentials: "include", ...init });
}
