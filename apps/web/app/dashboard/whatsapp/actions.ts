"use server";

export async function loginChatwootAction(email: string, password: string) {
  const CHATWOOT_URL = "https://chatwoot.servilutioncrm.cloud";
  
  try {
    const response = await fetch(`${CHATWOOT_URL}/api/v1/auth/sign_in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.errors?.[0] || "Credenciales incorrectas o error en el servidor de Chatwoot" 
      };
    }

    // Chatwoot typically returns tokens in headers: access-token, client, uid
    const accessToken = response.headers.get("access-token");
    const client = response.headers.get("client");
    const uid = response.headers.get("uid");
    const expiry = response.headers.get("expiry");

    const data = await response.json();

    return {
      success: true,
      data: {
        user: data.data,
        auth: {
          accessToken,
          client,
          uid,
          expiry
        }
      }
    };
  } catch (error) {
    console.error("Error logging into Chatwoot:", error);
    return { 
      success: false, 
      error: "No se pudo conectar con el servidor de Chatwoot. Por favor, verifica tu conexión." 
    };
  }
}
