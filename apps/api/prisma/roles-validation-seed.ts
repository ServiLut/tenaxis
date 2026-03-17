import { PrismaClient, Role, TipoCliente, EstadoOrden, MembershipStatus, Tenant } from '../src/generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import bcrypt from 'bcrypt';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

let connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DIRECT_URL;

// Limpieza de parámetros SSL
try {
  if (connectionString) {
    const urlObj = new URL(connectionString);
    urlObj.searchParams.delete('sslmode');
    urlObj.searchParams.delete('sslrootcert');
    urlObj.searchParams.delete('sslcert');
    urlObj.searchParams.delete('sslkey');
    if (!urlObj.searchParams.has('schema')) {
      urlObj.searchParams.set('schema', 'public');
    }
    urlObj.searchParams.set('options', '-c search_path=public');
    connectionString = urlObj.toString();
  }
} catch (e) {
  console.error('Error parsing connection string', e);
}

const pool = new pg.Pool({ 
  connectionString,
  ssl: false
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const suffix = Math.floor(Date.now() / 1000);
  console.log(`🚀 Iniciando Roles Validation Seed (Suffix: ${suffix})...`);
  const passwordHash = bcrypt.hashSync('Password123!', 10);

  // 1. Crear Tenants
  const tenants: Tenant[] = [];
  for (let i = 1; i <= 2; i++) {
    const tenant = await prisma.tenant.create({
      data: {
        nombre: `Tenant de Prueba ${i} - ${suffix}`,
        slug: `test-tenant-${i}-${suffix}`,
        isActive: true,
      }
    });
    tenants.push(tenant);
    console.log(`✅ Tenant creado: ${tenant.nombre}`);

    // 2. Crear Empresa para el Tenant
    const empresa = await prisma.empresa.create({
      data: {
        tenantId: tenant.id,
        nombre: `Empresa Test ${i} - ${suffix}`,
        activo: true,
      }
    });
    console.log(`✅ Empresa creada: ${empresa.nombre} para el Tenant ${tenant.nombre}`);

    // 3. Crear Usuarios para cada Rol
    const roles = Object.values(Role);
    for (const role of roles) {
      const email = `${role.toLowerCase()}.${i}.${suffix}@test.com`;
      const user = await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          nombre: `User ${role}`,
          apellido: `Test ${i}`,
          numeroDocumento: `${suffix}${i}${roles.indexOf(role)}`,
          isActive: true
        }
      });

      const tm = await prisma.tenantMembership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: role,
          status: MembershipStatus.ACTIVE,
          aprobado: true
        }
      });

      await prisma.empresaMembership.create({
        data: {
          tenantId: tenant.id,
          membershipId: tm.id,
          empresaId: empresa.id,
          role: role
        }
      });
      console.log(`   👤 Usuario creado: ${email} con rol ${role}`);
    }

    // 4. Crear algunos datos adicionales (Servicios, Clientes)
    const servicio = await prisma.servicio.create({
      data: {
        nombre: `Servicio Test ${i}`,
        tenantId: tenant.id,
        empresaId: empresa.id,
      }
    });

    const cliente = await prisma.cliente.create({
      data: {
        nombre: `Cliente Test ${i}`,
        apellido: `${suffix}`,
        telefono: `300${suffix}${i}`,
        tipoCliente: TipoCliente.PERSONA,
        tenantId: tenant.id,
        empresaId: empresa.id,
      }
    });
    
    console.log(`   🛠️ Datos de prueba creados para ${tenant.nombre}`);
  }

  console.log('✅ Seed de Validación de Roles completado.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
