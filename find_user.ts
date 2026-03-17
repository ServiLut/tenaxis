
import { PrismaClient } from './apps/api/src/generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, 'apps/api/.env'), override: true });

let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.DIRECT_URL;

const pool = new pg.Pool({ connectionString, ssl: false });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'xl9luis@gmail.com' },
    include: {
      memberships: {
        include: {
          tenant: true,
          empresaMemberships: {
            include: {
              empresa: true
            }
          }
        }
      }
    }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('USER_INFO:');
  console.log(JSON.stringify(user, null, 2));

  for (const membership of user.memberships) {
    const teamMembers = await prisma.tenantMembership.findMany({
      where: { tenantId: membership.tenantId },
      include: {
        user: {
          select: {
            email: true,
            nombre: true,
            apellido: true
          }
        },
        empresaMemberships: {
          include: {
            empresa: true
          }
        }
      }
    });

    console.log(`TEAM_MEMBERS_FOR_TENANT_${membership.tenant.nombre}:`);
    console.log(`Count: ${teamMembers.length}`);
    teamMembers.forEach(m => {
      const empresas = m.empresaMemberships.map(em => em.empresa.nombre).join(', ');
      console.log(`- ${m.user.nombre} ${m.user.apellido} (${m.user.email}) - Role: ${m.role} - Empresas: ${empresas}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
