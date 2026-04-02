# Tasks: Auth Frontend Redesign

## Phase 1: Foundation

- [ ] 1.1 Crear `apps/web/app/(auth)/_components/auth-shell.tsx` con layout compartido, hero panel y motion GSAP scoped.
- [ ] 1.2 Crear `apps/web/app/(auth)/_components/auth-ui.tsx` para surface, alerts, field chrome, metrics y success cards.
- [ ] 1.3 Crear `apps/web/app/(auth)/_components/auth-error.ts` para normalizar mensajes de red, auth y validación.
- [ ] 1.4 Añadir utilidades visuales auth en `apps/web/app/globals.css`.

## Phase 2: Core Implementation

- [ ] 2.1 Refactorizar `iniciar-sesion/page.tsx` con nuevo shell, CTA claros y feedback inline robusto.
- [ ] 2.2 Refactorizar `registro/page.tsx` con wizard consistente, progress UI y validaciones por paso.
- [ ] 2.3 Refactorizar `olvide-mi-contraseña/page.tsx` con success state, retry messaging y navegación coherente.
- [ ] 2.4 Refactorizar `reiniciar-contraseña/page.tsx` con validación de contraseña, success state y rutas corregidas.

## Phase 3: Verification

- [ ] 3.1 Revisar rutas, CTAs y copy de todas las pantallas auth para evitar links rotos.
- [ ] 3.2 Verificar que GSAP solo corra en cliente y respete `prefers-reduced-motion`.
- [ ] 3.3 Revisar estados de loading, disabled, empty y error en cada formulario.

## Phase 4: Cleanup

- [ ] 4.1 Eliminar estilos duplicados o copy legado dentro de las páginas auth.
- [ ] 4.2 Documentar limitaciones: sin test runner, validación por smoke/manual review.
