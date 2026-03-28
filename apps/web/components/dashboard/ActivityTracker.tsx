"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteBrowserCookie } from "@/lib/api/browser-client";
import { authClient } from "@/lib/api/auth-client";
import { monitoringClient } from "@/lib/api/monitoreo-client";

// Configuración de tiempos - Movido fuera para ser constante
const INACTIVITY_THRESHOLD = 2 * 60 * 1000; // 2 min para empezar a marcar inactividad en DB
const AUTO_LOGOUT_TIME = 4 * 60 * 1000;     // 4 min para cierre de sesión automático
const HEARTBEAT_INTERVAL = 60 * 1000;       // 1 min para latidos

export function ActivityTracker() {
  const pathname = usePathname();
  const router = useRouter();
  // Inicializar en 0 para evitar llamada impura en renderizado
  const lastActivityRef = useRef<number>(0);
  
  const sendEvent = useCallback(async (tipo: string, descripcion?: string) => {
    try {
      await monitoringClient.trackEvent({ tipo, descripcion, ruta: pathname });
    } catch (_e) {
      // Fallo silencioso
    }
  }, [pathname]);

  const sendHeartbeat = useCallback(async (inactiveMinutes: number = 0) => {
    try {
      await monitoringClient.sendHeartbeat(inactiveMinutes);
    } catch (_e) {
      // Ignorar
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await sendEvent("SESSION_TIMEOUT", "Cierre de sesión automático por 4 minutos de inactividad");

    try {
      await authClient.logout();
    } catch (_error) {
      // Ignorar errores de logout remoto y limpiar sesion local igual.
    }

    deleteBrowserCookie("access_token");
    deleteBrowserCookie("x-enterprise-id");
    deleteBrowserCookie("x-test-role");
    
    toast.error("Sesión Expirada", {
      description: "Se ha cerrado tu sesión automáticamente tras 4 minutos de inactividad por seguridad.",
      duration: 10000,
    });

    router.push("/iniciar-sesion");
  }, [sendEvent, router]);

  useEffect(() => {
    // Establecer actividad inicial en el montaje
    lastActivityRef.current = Date.now();

    // No trackear en la página de login
    if (pathname === "/iniciar-sesion") return;

    // Registrar cambio de página
    sendEvent("PAGE_VIEW", `Usuario entró a ${pathname}`);

    const isWhatsappRoute = pathname?.startsWith("/dashboard/whatsapp");

    // 1. Rastrear cambios de foco
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendEvent("FOCO_PERDIDO", "El usuario cambió de pestaña o minimizó");
      } else {
        sendEvent("FOCO_RECUPERADO", "El usuario regresó a la pestaña");
      }
    };

    // 2. Rastrear actividad real
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Especial para iframes (WhatsApp)
    const handleBlur = () => {
      // Si el usuario hace clic en un iframe, el window pierde el foco
      // pero el activeElement será el iframe.
      setTimeout(() => {
        if (document.activeElement instanceof HTMLIFrameElement) {
          updateActivity();
        }
      }, 100);
    };

    // 3. Intervalo de Heartbeat e Inactividad
    const heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      // Si estamos en WhatsApp y el iframe tiene el foco, actualizamos actividad
      if (isWhatsappRoute && document.activeElement instanceof HTMLIFrameElement) {
        updateActivity();
        sendHeartbeat(0);
        return;
      }

      if (timeSinceLastActivity >= INACTIVITY_THRESHOLD) {
        sendHeartbeat(1);
        if (timeSinceLastActivity < INACTIVITY_THRESHOLD + HEARTBEAT_INTERVAL) {
          sendEvent("INACTIVIDAD_INICIO", "El usuario entró en estado de inactividad");
        }
      } else {
        sendHeartbeat(0);
      }
    }, HEARTBEAT_INTERVAL);

    // 4. Intervalo de Cierre de Sesión (Chequeo más frecuente)
    const logoutCheckTimer = setInterval(() => {
      const now = Date.now();
      
      // Si estamos en WhatsApp y el iframe tiene el foco, no cerramos sesión
      if (isWhatsappRoute && document.activeElement instanceof HTMLIFrameElement) {
        updateActivity();
        return;
      }

      if (now - lastActivityRef.current >= AUTO_LOGOUT_TIME) {
        handleLogout();
      }
    }, 5000); // Revisar cada 5 segundos

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("mousemove", updateActivity);
    document.addEventListener("keydown", updateActivity);
    document.addEventListener("click", updateActivity);
    document.addEventListener("scroll", updateActivity);
    window.addEventListener("blur", handleBlur);

    return () => {
      clearInterval(heartbeatTimer);
      clearInterval(logoutCheckTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("mousemove", updateActivity);
      document.removeEventListener("keydown", updateActivity);
      document.removeEventListener("click", updateActivity);
      document.removeEventListener("scroll", updateActivity);
      window.removeEventListener("blur", handleBlur);
    };
  }, [pathname, sendEvent, sendHeartbeat, handleLogout]);

  return null;
}
