const API_URL = process.env.EXPO_PUBLIC_API_URL;

type BodyInitType =
  | string
  | FormData
  | Blob
  | ArrayBuffer
  | ArrayBufferView
  | URLSearchParams
  | null
  | undefined
  | Record<string, any>;

export async function apiFetch(
  endpoint: string,
  options: Omit<RequestInit, "body"> & { body?: BodyInitType } = {}
) {
  const { body, headers, ...rest } = options;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body:
      body && typeof body === "object" && !(body instanceof FormData)
        ? JSON.stringify(body)
        : body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data;
}