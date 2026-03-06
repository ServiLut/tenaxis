"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

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
      await fetch("/api/monitoring/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, descripcion, ruta: pathname }),
      });
    } catch (_e) {
      // Fallo silencioso
    }
  }, [pathname]);

  const sendHeartbeat = useCallback(async (inactiveMinutes: number = 0) => {
    try {
      await fetch("/api/monitoring/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inactiveMinutes }),
      });
    } catch (_e) {
      // Ignorar
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await sendEvent("SESSION_TIMEOUT", "Cierre de sesión automático por 4 minutos de inactividad");
    
    // Limpiar cookies
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "sesion_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
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

    // 3. Intervalo de Heartbeat e Inactividad
    const heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
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
      if (now - lastActivityRef.current >= AUTO_LOGOUT_TIME) {
        handleLogout();
      }
    }, 5000); // Revisar cada 5 segundos

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("mousemove", updateActivity);
    document.addEventListener("keydown", updateActivity);
    document.addEventListener("click", updateActivity);
    document.addEventListener("scroll", updateActivity);

    return () => {
      clearInterval(heartbeatTimer);
      clearInterval(logoutCheckTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("mousemove", updateActivity);
      document.removeEventListener("keydown", updateActivity);
      document.removeEventListener("click", updateActivity);
      document.removeEventListener("scroll", updateActivity);
    };
  }, [pathname, sendEvent, sendHeartbeat, handleLogout]);

  return null;
}
