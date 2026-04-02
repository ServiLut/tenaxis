# Proposal: Auth Frontend Redesign

## Intent

Modernizar `apps/web/app/(auth)` con una experiencia visual más memorable, animaciones GSAP y estados de error/éxito más claros sin tocar backend.

## Scope

### In Scope
- Unificar el lenguaje visual de login, registro, recuperación y reset.
- Crear una base compartida de layout, motion y feedback UI.
- Mejorar manejo de errores, loading, validaciones y success states.

### Out of Scope
- Cambios en endpoints, DTOs o lógica de NestJS.
- Cambios de esquema, auth flow backend o Supabase backend.

## Approach

Crear componentes compartidos en `apps/web/app/(auth)/_components`, centralizar copy y mapeo de errores frontend, y usar GSAP con `useGSAP()` para entrances, depth y motion progresivo con respeto a reduced-motion.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/app/(auth)` | Modified | Páginas auth y componentes compartidos nuevos |
| `apps/web/app/globals.css` | Modified | Utilidades visuales y soporte del nuevo look |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Exceso de motion afecte UX | Med | Reduced motion + timelines breves |
| Inconsistencia entre rutas auth | Med | Compartir shell, feedback y helpers |
| Regresiones en links auth | Med | Revisar rutas y CTA finales |

## Rollback Plan

Revertir cambios en `apps/web/app/(auth)` y `globals.css`, dejando intactos clientes API y backend.

## Dependencies

- `gsap` y `@gsap/react` ya instalados en `apps/web`

## Success Criteria

- [ ] Todas las pantallas de `apps/web/app/(auth)` comparten un sistema visual coherente.
- [ ] Login, registro, forgot y reset muestran errores y estados de carga/éxito más claros.
- [ ] Las animaciones entran con GSAP sin romper SSR ni reduced-motion.
