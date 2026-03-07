"use server";

import { cookies } from "next/headers";
import { authClient } from "@/lib/api/auth-client";

export async function loginAction(data: any) {
  try {
    const result = await authClient.login(data) as any;
    const cookieStore = await cookies();
    
    const token = result.access_token || result.accessToken;
    
    if (token) {
      cookieStore.set("access_token", token, {
        path: "/",
        httpOnly: false, // Set to true in production if not needed by client
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });
    }
    
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function registerAction(data: any) {
  try {
    const result = await authClient.register(data);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function forgotPasswordAction(email: string) {
  try {
    const result = await authClient.forgotPassword(email);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("x-enterprise-id");
  cookieStore.delete("x-test-role");
  return { success: true };
}
