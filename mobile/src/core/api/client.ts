const API_URL = process.env.EXPO_PUBLIC_API_URL;
const REQUEST_TIMEOUT_MS = 15_000;

console.log('[apiFetch] API_URL:', API_URL);

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        ...contentTypeHeader,
        ...(headers || {}),
      },
      body:
        body && typeof body === "object" && !isFormData
          ? JSON.stringify(body)
          : body,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      console.error(`[apiFetch] Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${endpoint}`);
      throw new Error(`Network request timed out. Check that the backend is reachable at ${API_URL}.`);
    }
    console.error(`[apiFetch] Network error on ${endpoint}:`, err?.message ?? err);
    throw new Error(`Network error: ${err?.message ?? 'Unable to connect to server.'}`);
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`[apiFetch] Non-JSON response (HTTP ${response.status}) from ${endpoint}:`, text);
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  if (!response.ok) {
    const detail = data?.detail ?? data?.message ?? JSON.stringify(data);
    console.error(`[apiFetch] HTTP ${response.status} from ${endpoint}:`, detail);
    throw new Error(`HTTP ${response.status}: ${detail}`);
  }

  return data;
}