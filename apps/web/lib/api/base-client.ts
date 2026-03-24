import { buildApiUrl } from "@/lib/api/url";

export async function getAuthHeaders(
  isFormData = false,
  options: { includeEnterpriseId?: boolean } = {},
) {
  let token: string | undefined;
  let enterpriseId: string | undefined;
  let testRole: string | undefined;

  // Detectar si estamos en el servidor o en el cliente
  if (typeof window === "undefined") {
    // Servidor: Usamos cookies() de next/headers
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      token = cookieStore.get("access_token")?.value;
      enterpriseId = cookieStore.get("x-enterprise-id")?.value;
      testRole = cookieStore.get("x-test-role")?.value;
    } catch (e) {
      console.warn("[API Client] Error accessing cookies on server:", e);
    }
  } else {
    // Cliente: Usamos document.cookie
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return undefined;
    };
    token = getCookie("access_token");
    enterpriseId = getCookie("x-enterprise-id");
    testRole = getCookie("x-test-role");
  }

  const { includeEnterpriseId = true } = options;
  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (includeEnterpriseId && enterpriseId) {
    headers["x-enterprise-id"] = enterpriseId;
  }

  if (testRole) {
    headers["x-test-role"] = testRole;
  }

  return headers;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit & { includeEnterpriseId?: boolean } = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(await getAuthHeaders(isFormData, { includeEnterpriseId: options.includeEnterpriseId })),
    ...(options.headers as Record<string, string>),
  };

  const url = buildApiUrl(endpoint);
  console.log(`[API Client] Fetching: ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
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
      
      // Manejar token expirado (401)
      if (response.status === 401 && typeof window !== "undefined") {
        console.warn("[API Client] Session expired (401). Redirecting to login...");
        
        // Limpiar cookies en el cliente
        document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
        document.cookie = "x-enterprise-id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
        document.cookie = "x-test-role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
        document.cookie = "sesion_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
        
        // Evitar bucles de redirección si ya estamos en la página de login
        if (!window.location.pathname.includes('/auth/iniciar-sesion')) {
          window.location.href = '/auth/iniciar-sesion?expired=true';
          // Retornar una promesa que nunca se resuelve para detener la ejecución actual
          return new Promise(() => {});
        }
      }

      throw new Error((result as { message?: string })?.message || `API Error: ${response.status}`);
    }

    return ((result as { data?: T } | null)?.data || result) as T;
  } catch (error) {
    console.error(`[API Client] Fetch failed for ${url}:`, {
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? (error as { cause?: unknown }).cause : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
