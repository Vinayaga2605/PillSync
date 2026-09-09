import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const TOKEN_KEY = "pillsync_token";

/**
 * TEMPORARY, DEV-ONLY BRIDGE — Module 3 (Medicine Management) has no login
 * page; that belongs to the separate Auth module. Every /medicines endpoint
 * still needs a logged-in user to scope data to, so — only when a real API
 * is configured (VITE_API_BASE_URL is set) and no token is already stored —
 * this fetches a token for a seeded demo user from the backend's dev-login
 * endpoint (see server/src/routes/authRoutes.js) and stores it under the
 * same "pillsync_token" key medicineService's axios interceptor already
 * reads.
 *
 * Delete this file (and the one call site in main.tsx) once the real Auth
 * module is wired up and issuing real tokens on login.
 */
export async function ensureDevSession(): Promise<void> {
  if (!BASE_URL) return; // still on mock data — nothing to authenticate
  if (localStorage.getItem(TOKEN_KEY)) return; // already have a token

  try {
    const { data } = await axios.post<{ token: string }>(`${BASE_URL}/auth/dev-login`);
    if (data?.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }
  } catch {
    // If dev-login is disabled or the backend isn't reachable yet, fail
    // quietly — API calls will 401 and the UI's existing error handling
    // takes over from there.
  }
}
