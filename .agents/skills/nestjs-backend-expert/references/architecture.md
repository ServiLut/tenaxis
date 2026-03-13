# Arquitectura Monorepo Tenaxis (SaaS B2B)

Este proyecto separa estrictamente las responsabilidades para garantizar escalabilidad y seguridad.

## 📁 Estructura del Monorepo
- `apps/api`: NestJS API (Único con acceso a Prisma/DB).
- `apps/web`: Next.js Frontend (Sin acceso a Prisma, consume el API vía HTTP).
- `packages/ui`: Componentes compartidos de React (shadcn/ui).

## 🌍 Flujo de Peticiones
1. **Request:** El frontend Next.js hace un fetch al API NestJS con el token JWT.
2. **Auth:** NestJS valida el JWT y el `tenant_id` que contiene.
3. **CLS:** El `tenant_id` se guarda en un contexto local (nestjs-cls) para toda la petición.
4. **Prisma:** El servicio utiliza el `tenant_id` del CLS para filtrar todas las consultas a PostgreSQL.

## ⛓️ Estructura de Poder (Tenancy)
1. **Tenant (Conglomerado):** Entidad raíz.
2. **Empresa:** Entidades hijas del Tenant.
3. **Zona:** Filtro geográfico adicional (opcional por rol).

## 🛡️ Seguridad
- El frontend NUNCA debe importar nada de `@prisma/client`.
- No se permiten Server Actions en Next.js que conecten directamente a la base de datos.
- Las validaciones se hacen en NestJS mediante DTOs y class-validator.
