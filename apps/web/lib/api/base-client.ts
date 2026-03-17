import { cookies } from "next/headers";

export const getApiUrl = () => {
  // En el servidor (Next.js Actions/SSR), fetch() requiere una URL absoluta.
  // Los rewrites de next.config.ts NO se aplican a las llamadas fetch internas del servidor.
  if (typeof window === "undefined") {
    return process.env.NESTJS_API_URL || "http://localhost:4000";
  }
  
  // En el cliente, usamos la ruta relativa que pasa por el proxy de Next.js
  // para evitar problemas de CORS y centralizar la configuración.
  return "/api";
};

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

    const contentType = response.headers.get("content-type");
    let result: unknown;
    
    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${text || response.statusText}`);
      }
      result = text;
    }

    if (!response.ok) {
      console.error(`[API Client] Error response:`, result);
      throw new Error((result as { message?: string })?.message || `API Error: ${response.status}`);
    }

    return ((result as { data?: T } | null)?.data || result) as T;
  } catch (error) {
    console.error(`[API Client] Fetch failed for ${url}:`, {
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? (error as any).cause : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
