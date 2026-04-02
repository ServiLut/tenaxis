# Design: Auth Frontend Redesign

## Technical Approach

Implementar un auth design system local al route group `(auth)` y refactorizar las cuatro páginas para que consuman shell, paneles, badges de estado, campos decorados y animaciones GSAP reutilizables.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Shared shell | Crear `_components/auth-shell.tsx` | Duplicar layout por página | Reduce drift visual y facilita mantener CTAs, fondos y toggle |
| Motion model | `useGSAP()` + timeline scoped por componente | CSS-only animation | GSAP ya está instalado y da mejor control, cleanup y reduced-motion |
| Error handling | Helper frontend para normalizar mensajes y banners consistentes | Manejo inline por página | Evita copy inconsistente y cubre 401/403/429/500/network |
| Form composition | Componentes locales para hero, surface, status y field hints | Seguir con JSX monolítico | Mejora mantenibilidad del route group |

## Data Flow

User input → page local state → `authClient` / Supabase client → error normalizer → inline banner / success card → redirect CTA

GSAP init → shell scope ref → hero/card/ambient layers entrance → cleanup on unmount

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/web/app/(auth)/_components/auth-shell.tsx` | Create | Layout compartido, ambient visuals y motion |
| `apps/web/app/(auth)/_components/auth-ui.tsx` | Create | Cards, badges, alerts, field wrappers, section title |
| `apps/web/app/(auth)/_components/auth-error.ts` | Create | Normalización de mensajes de error frontend |
| `apps/web/app/(auth)/iniciar-sesion/page.tsx` | Modify | Nuevo login visual + hardening |
| `apps/web/app/(auth)/registro/page.tsx` | Modify | Wizard más claro y consistente |
| `apps/web/app/(auth)/olvide-mi-contraseña/page.tsx` | Modify | Estado de envío y guía visual consistente |
| `apps/web/app/(auth)/reiniciar-contraseña/page.tsx` | Modify | Mejor validación y success state coherente |
| `apps/web/app/globals.css` | Modify | Utilidades ambient/noise/orb/grid para auth |

## Interfaces / Contracts

```ts
export function getAuthErrorMessage(error: unknown, fallback?: string): string
```

```tsx
<AuthShell variant="login|register|recovery|reset" eyebrow="..." title="..." description="...">...</AuthShell>
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | No runner disponible | Verificación manual enfocada en estados UI |
| Integration | Formularios auth con clientes actuales | Revisión estática y smoke visual |
| E2E | No infraestructura detectada | No aplicable en esta sesión |

## Migration / Rollout

No migration required.

## Open Questions

- [ ] Ninguna bloqueante; solo validar visualmente los links finales auth.
