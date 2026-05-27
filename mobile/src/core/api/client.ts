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

  const isFormData = body instanceof FormData;
  const contentTypeHeader = isFormData ? {} : { "Content-Type": "application/json" };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    headers: {
      ...contentTypeHeader,
      ...(headers || {}),
    },
    body:
      body && typeof body === "object" && !isFormData
        ? JSON.stringify(body)
        : body,
  });

  const text = await response.text();

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    // Server returned non-JSON (e.g. plain-text 500 "Internal Server Error")
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  if (!response.ok) {
    const detail = data?.detail ?? data?.message ?? JSON.stringify(data);
    throw new Error(`HTTP ${response.status}: ${detail}`);
  }

  return data;
}