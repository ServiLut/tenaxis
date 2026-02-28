const { PrismaClient } = require('./src/generated/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:dJOeUJhZ1x2mGpm7mHvh@76.13.101.140:5433/tenaxis"
    }
  }
});

async function main() {
  const tenantId = "323c9206-75ac-47e4-9e53-b023445ee3de";
  console.log(`Checking services for tenant: ${tenantId}`);
  
  try {
    // Intenta contar sin el include que falla
    const count = await prisma.ordenServicio.count({
      where: { tenantId }
    });
    console.log(`Total orders found for tenant: ${count}`);
    
    // Intenta obtener algunos registros
    const orders = await prisma.ordenServicio.findMany({
      where: { tenantId },
      take: 5
    });
    console.log('Sample orders:', JSON.stringify(orders, null, 2));
    
    // Verifica si la tabla de evidencias existe intentando una consulta simple
    try {
      await prisma.evidenciaServicio.count();
      console.log('Table evidencias_servicio EXISTS');
    } catch (e) {
      console.log('Table evidencias_servicio DOES NOT EXIST:', e.message);
    }
  } catch (error) {
    console.error('Error querying database:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
