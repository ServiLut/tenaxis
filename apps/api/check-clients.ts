const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.cliente.count();
  console.log('Total clients in DB:', count);
  const all = await prisma.cliente.findMany();
  console.log(all);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());