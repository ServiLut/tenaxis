import { cookies } from "next/headers";

export const getApiUrl = () => process.env.NESTJS_API_URL || "http://127.0.0.1:4000";

export async function getAuthHeaders(isFormData = false) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const enterpriseId = cookieStore.get("x-enterprise-id")?.value;
  const testRole = cookieStore.get("x-test-role")?.value;

  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (enterpriseId) {
    headers["x-enterprise-id"] = enterpriseId;
  }

  if (testRole) {
    headers["x-test-role"] = testRole;
  }

  return headers;
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const apiUrl = getApiUrl();
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(await getAuthHeaders(isFormData)),
    ...(options.headers as Record<string, string>),
  };

  const url = `${apiUrl}${endpoint}`;
  console.log(`[API Client] Fetching: ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log(`[API Client] Response: ${response.status} ${url}`);

    const result = await response.json();

    if (!response.ok) {
      console.error(`[API Client] Error response:`, result);
      throw new Error(result.message || `API Error: ${response.status}`);
    }

    return (result.data || result) as T;
  } catch (error) {
    console.error(`[API Client] Fetch failed: ${url}`, error);
    throw error;
  }
}
