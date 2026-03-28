---
name: api-url-routing
description: Decide correctamente entre NEXT_PUBLIC_API_URL y NESTJS_API_URL en el monorepo Tenaxis. Úsala cuando trabajes con fetch, api clients, Server Components, useEffect, eventos de UI, Docker, VPS o debugging de mixed content y SSR vs navegador.
user-invocable: false
---

# API URL Routing

Aplica esta skill cuando modifiques o revises llamadas HTTP entre `apps/web` y `apps/api`.

## Regla Principal

- Usa `NESTJS_API_URL` cuando el código corre en el servidor de Next.js.
- Usa `NEXT_PUBLIC_API_URL` cuando el código corre en el navegador.

## Cuándo usar `NESTJS_API_URL`

- `page.tsx` sin `"use client"`
- Server Components
- SSR
- `route.ts`
- middleware/proxy server-side
- utilidades server-only
- cualquier fetch ejecutado dentro del contenedor `web`

En producción normalmente debe apuntar al nombre del servicio o contenedor en la red interna, por ejemplo:

```env
NESTJS_API_URL=http://api:4000
```

## Cuándo usar `NEXT_PUBLIC_API_URL`

- archivos con `"use client"`
- `useEffect`
- `onClick`, `onSubmit`, handlers de UI
- hooks cliente
- componentes que usan `window`, `document`, `localStorage` o cookies del navegador
- cualquier request disparado desde el browser

En producción debe ser una URL pública HTTPS:

```env
NEXT_PUBLIC_API_URL=https://api.tudominio.com
```

## Regla Mental Rápida

- Si toca APIs del navegador, usa URL pública.
- Si corre antes de que el HTML llegue al navegador, usa URL interna.
- No decidas por “ver” vs “editar”; decide por entorno de ejecución.

## Señales de Error Comunes

- `Mixed Content`: el browser está llamando `http://...` desde una página `https://...`. Corrige `NEXT_PUBLIC_API_URL` a `https://...`.
- `Failed to fetch` en cliente con hostname interno: se está exponiendo un nombre de contenedor al navegador.
- SSR lento o tráfico innecesario saliendo por internet entre contenedores: una llamada server-side está usando la URL pública en lugar de la interna.

## Implementación en Tenaxis

- En `apps/web`, los clientes compartidos deben resolver la URL base según entorno.
- Prefiere helpers compartidos de `lib/api` en vez de construir URLs manualmente.
- Si encuentras un `fetch("http://...")` hardcodeado en frontend, corrígelo.
- Si un componente cliente importa Server Actions sólo para hacer fetch a NestJS, prefiere un API client directo.

## Checklist Antes de Terminar

- ¿El código corre en servidor o navegador?
- ¿La URL pública es HTTPS?
- ¿El nombre del contenedor quedó sólo para tráfico interno?
- ¿El archivo puede usar un cliente compartido en vez de construir la URL a mano?
