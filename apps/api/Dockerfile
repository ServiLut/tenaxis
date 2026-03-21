# 1. Base y Prune
FROM node:22-alpine AS base
WORKDIR /app
RUN npm install turbo --global
COPY . .
RUN turbo prune --scope=api --docker

# 2. Instalar y Construir
FROM node:22-alpine AS build
WORKDIR /app

# Instalar dependencias necesarias para módulos nativos en Alpine
RUN apk add --no-cache openssl libc6-compat python3 make g++

# Enable corepack para pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiamos lo necesario para instalar
COPY --from=base /app/out/json/ .
COPY --from=base /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Instalamos todo (incluyendo devDeps para el build)
RUN pnpm install --frozen-lockfile

# Copiamos el código fuente
COPY --from=base /app/out/full/ .

# Generar Prisma Client y construir
RUN pnpm run build --filter=api

# Usamos pnpm deploy para extraer la API y sus dependencias de producción a una carpeta aislada
# Esto resuelve los problemas de symlinks en monorepos
RUN pnpm deploy --filter=api --prod /app/isolated

# 3. Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Dependencias de runtime
RUN apk add --no-cache openssl libc6-compat

# Copiamos la carpeta aislada generada por pnpm deploy
COPY --from=build /app/isolated ./

# Copiamos los archivos compilados de la API (pnpm deploy no los incluye porque están en dist)
COPY --from=build /app/apps/api/dist ./dist
# Copiamos prisma porque se usa en runtime
COPY --from=build /app/apps/api/prisma ./prisma

EXPOSE 4000

CMD ["node", "dist/main.js"]
