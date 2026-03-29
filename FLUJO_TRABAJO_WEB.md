# Flujo de Trabajo Tenaxis SaaS (apps/web)

Este documento detalla la arquitectura y lógica de navegación de los módulos principales del dashboard.

---

## 1. Autenticación (`/(auth)/iniciar-sesion`)
**Archivo:** `apps/web/app/(auth)/iniciar-sesion/page.tsx`

El flujo de entrada al sistema sigue estos pasos:
1.  **Ingreso de Credenciales:** El usuario ingresa email y password en el `LoginForm`.
2.  **Validación API:** Se llama a `authClient.login(formData)`.
3.  **Persistencia de Sesión (Cookies & LocalStorage):**
    - `access_token`: Almacenado como cookie con `SameSite=Lax`.
    - `sesion_id` y `tenant-id`: Almacenados como cookies para uso del middleware/servidor.
    - `user`: Se guarda el objeto de usuario completo en `localStorage` para hidratación rápida de la UI.
4.  **Redirección:** Si el login es exitoso, se dispara `window.location.href = "/dashboard"`.

---

## 2. Dashboard Principal (`/dashboard`)
**Archivo:** `apps/web/app/dashboard/page.tsx`

Es el "Gatekeeper" del acceso por organización:
1.  **Detección de Scope:** Al montar el componente, se extrae el `accessScope` desde el navegador.
2.  **Validación de Tenant:**
    - Si el usuario **no tiene un `tenantId`** activo, se le muestra el componente `JoinOrganization` (para unirse o crear una empresa).
    - Si el usuario **tiene `tenantId`**, se sincroniza la cookie `tenant-id` (si faltara) y se renderiza `DashboardContent`.
3.  **Proveedores:** Todo el contenido se envuelve en `DashboardProviders` para manejar el estado global del panel.

---

## 3. Gestión de Clientes (`/dashboard/clientes`)
**Archivo:** `apps/web/app/dashboard/clientes/page.tsx`

Este módulo utiliza un patrón de **Server Side Fetching**:
1.  **Carga Paralela:** Usa `Promise.all` para disparar múltiples *Server Actions* simultáneamente:
    - Datos del dashboard de clientes.
    - Sugerencias y estadísticas.
    - Diccionarios de Departamentos y Municipios.
2.  **Renderizado:** Pasa toda la data hidratada al Client Component `ClienteList`, garantizando que la primera carga sea inmediata y SEO-friendly.

---

## 4. Gestión de Servicios (`/dashboard/servicios`)
**Archivo:** `apps/web/app/dashboard/servicios/page.tsx`

Es el módulo más complejo (Operational Core):
1.  **Control de Acceso:** Usa el hook `useUserRole` para validar permisos específicos (`SERVICE_VIEW`, `SERVICE_MANAGE`, etc.).
2.  **Cola Operativa:** Incluye una lógica de filtrado avanzado para detectar:
    - Servicios sin asignar para hoy.
    - Servicios atrasados (Vencidos).
    - Servicios pendientes de cierre técnico.
3.  **Flujo de Liquidación:**
    - Distingue entre **Efectivo** (requiere conciliación posterior) y **Transferencia** (requiere carga de comprobante/evidencia).
    - Maneja un "Financial Lock" para congelar órdenes ya procesadas por contabilidad.
4.  **Seguimientos (Follow-ups):** Permite gestionar la trazabilidad de servicios que requieren contacto posterior (Garantías, Refuerzos).

---

## 5. Agenda Técnica (`/dashboard/agenda`)
**Archivo:** `apps/web/app/dashboard/agenda/page.tsx`

Visualización temporal del trabajo:
1.  **Vistas:** Permite alternar entre vista diaria y semanal.
2.  **Filtrado por Operador:** Permite ver la carga de trabajo de un técnico específico o de todo el equipo.
3.  **Manejo de Zona Horaria:** Utiliza utilidades específicas para asegurar que todas las horas se visualicen en el contexto de **Bogotá (UTC-5)**, evitando desfases por el uso de UTC en la DB.
4.  **Interactividad:** Cada celda de la agenda permite navegar directamente a la edición del servicio.

---

### Notas de Arquitectura (Frontend)
- **Aislamiento:** El `enterpriseId` se resuelve dinámicamente basándose en el scope del usuario, asegurando que un operador solo vea lo que le corresponde a su sucursal/empresa.
- **Feedback Visual:** Se utiliza `sonner` para notificaciones y `lucide-react` para la iconografía consistente.
- **Performance:** Uso intensivo de `Suspense` y `Skeletons` para mejorar la percepción de carga en módulos pesados como Servicios y Agenda.
