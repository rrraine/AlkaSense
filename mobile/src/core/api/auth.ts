import { apiFetch } from "./client";

interface RegisterPayload {
  firebase_uid: string;
  email: string | null;
  full_name: string;
  role: string;
  institution: string;
}

export interface BackendUser {
  firebase_uid: string;
  email: string;
  full_name: string;
  role: string;
  institution: string;
  is_approved: boolean;
}

export async function registerUser(
  token: string,
  payload: RegisterPayload
) {
  return apiFetch("/auth/register", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: payload,
  });
}

/**
 * Fetches the current authenticated user's profile from the backend.
 * Used to re-seed SQLite when the local DB is wiped or reset.
 */
export async function fetchMe(token: string): Promise<BackendUser | null> {
  try {
    return await apiFetch("/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    return null;
  }
}