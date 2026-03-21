# 1. Base y Prune
FROM node:22-alpine AS base
WORKDIR /app
RUN npm install turbo --global
COPY . .
RUN turbo prune --scope=api --docker

# 2. Instalar y Construir
FROM node:22-alpine AS build
WORKDIR /app

# Instalar dependencias necesarias para Prisma y módulos nativos (bcrypt/sharp) en Alpine
RUN apk add --no-cache openssl libc6-compat python3 make g++

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiamos solo lo necesario para instalar dependencias
COPY --from=base /app/out/json/ .
COPY --from=base /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Instalamos ignorando scripts inicialmente para evitar que postinstall (prisma generate) falle
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copiamos el código fuente completo
COPY --from=base /app/out/full/ .

# Ahora instalamos nuevamente sin ignore-scripts para que postinstall y los módulos nativos se compilen correctamente
RUN pnpm install --frozen-lockfile

# Construir la API
RUN pnpm run build --filter=api

# 3. Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Instalamos dependencias de runtime (OpenSSL para Prisma, libc6-compat para módulos nativos)
RUN apk add --no-cache openssl libc6-compat

# Copiamos dependencias y build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/main.js"]
