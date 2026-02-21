const { PrismaClient } = require('./src/generated/client/client');
const prisma = new PrismaClient();

async function run() {
  const tenantId = '0d003940-5049-4ebe-86f8-d62605e26a93';
  const orConditions = [
    { telefono: '3000000000' }
  ];

  const existingClient = await prisma.cliente.findFirst({
    where: {
      tenantId,
      OR: orConditions,
      deletedAt: null,
    },
  });

  console.log("Found:", existingClient);
  
  const all = await prisma.cliente.findMany();
  console.log("All clients:", all.length);

  await prisma.$disconnect();
}
run();