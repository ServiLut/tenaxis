# Guía de Aislamiento Multitenant (Shared Schema)

En este proyecto usamos un esquema compartido donde la columna `tenant_id` es el único garante del aislamiento de datos.

## 🔐 Inyección de `tenant_id`
No confiamos en el cliente. El `tenant_id` se extrae del JWT y se inyecta en el servicio a través de `nestjs-cls`.

### Ejemplo de Servicio Seguro:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class ClientesService {
  constructor(
    private prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  async findAll() {
    const tenantId = this.cls.get('tenantId');
    return this.prisma.cliente.findMany({
      where: { tenant_id: tenantId },
    });
  }

  async create(createClienteDto: CreateClienteDto) {
    const tenantId = this.cls.get('tenantId');
    return this.prisma.cliente.create({
      data: {
        ...createClienteDto,
        tenant_id: tenantId, // Inyección obligatoria
      },
    });
  }
}
```

## 📜 Reglas de Prisma (schema.prisma)
Cualquier tabla operativa nueva DEBE incluir:
```prisma
model MiTabla {
  id         String   @id @default(uuid())
  tenant_id  String   @map("tenant_id")
  // ... resto de campos
  createdAt  DateTime @default(now()) @map("created_at")
  
  @@index([tenant_id])
}
```

## 🚫 Prácticas Prohibidas
- **JAMÁS** usar `prisma.cliente.deleteMany({})` sin un filtro `tenant_id`.
- **JAMÁS** recibir `tenant_id` como un campo editable en un `UpdateDto`.
- **JAMÁS** devolver datos de otro tenant por error en un `findOne`.
