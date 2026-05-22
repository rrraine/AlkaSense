import { apiFetch } from "./client";

interface RegisterPayload {
  firebase_uid: string;
  email: string | null;
  full_name: string;
  role: string;
  institution: string;
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