import { PrismaClient, Role, TipoCliente, EstadoOrden, MetodoPago, Servicio, Cliente } from '../src/generated/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

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

// IDS REALES PROPORCIONADOS POR EL USUARIO
const TENANT_ID = '0d003940-5049-4ebe-86f8-d62605e26a93';
const EMPRESA_ID = '05cefa1d-5018-4b9f-a5ee-96cd29c6eed0';

async function main() {
  console.log('🌱 Iniciando Seed de Clientes, Servicios y Recaudos...');

  // 1. Asegurar Métodos de Pago
  const metodosPagoNombres = ['EFECTIVO', 'TRANSFERENCIA', 'CREDITO', 'BONO', 'CORTESIA'];
  const metodosPago: MetodoPago[] = [];
  
  for (const nombre of metodosPagoNombres) {
    let mp = await prisma.metodoPago.findFirst({
      where: { nombre, empresaId: EMPRESA_ID }
    });
    
    if (!mp) {
      mp = await prisma.metodoPago.create({
        data: {
          nombre,
          tenantId: TENANT_ID,
          empresaId: EMPRESA_ID,
          activo: true,
        }
      });
    }
    metodosPago.push(mp);
  }
  console.log(`✅ Métodos de pago listos: ${metodosPago.length}`);

  // 2. Asegurar Servicios
  const serviciosNombres = ['CONTROL DE PLAGAS', 'DESINFECCION', 'LIMPIEZA DE TANQUES', 'MANTENIMIENTO'];
  const servicios: Servicio[] = [];

  for (const nombre of serviciosNombres) {
    let s = await prisma.servicio.findFirst({
      where: { nombre, empresaId: EMPRESA_ID }
    });
    
    if (!s) {
      s = await prisma.servicio.create({
        data: {
          nombre,
          tenantId: TENANT_ID,
          empresaId: EMPRESA_ID,
          activo: true,
        }
      });
    }
    servicios.push(s);
  }
  console.log(`✅ Servicios listos: ${servicios.length}`);

  // 3. Crear Clientes de prueba
  const clientesData = [
    { nombre: 'Carlos', apellido: 'Restrepo', telefono: '3115551234', correo: 'carlos@demo.com', tipoCliente: TipoCliente.PERSONA },
    { nombre: 'Diana', apellido: 'Valencia', telefono: '3226667890', correo: 'diana@demo.com', tipoCliente: TipoCliente.PERSONA },
    { razonSocial: 'Supermercados Unidosis', nit: '901.555.444-5', telefono: '3009998877', correo: 'logistica@unidosis.com', tipoCliente: TipoCliente.EMPRESA },
    { razonSocial: 'Hotel Continental', nit: '860.111.222-3', telefono: '3152223344', correo: 'mantenimiento@hotelcont.com', tipoCliente: TipoCliente.EMPRESA },
  ];

  const clientes: Cliente[] = [];
  for (const data of clientesData) {
    const c = await prisma.cliente.create({
      data: {
        ...data,
        tenantId: TENANT_ID,
        empresaId: EMPRESA_ID,
      }
    });
    clientes.push(c);
  }
  console.log(`✅ Clientes de prueba creados: ${clientes.length}`);

  // 4. Obtener Técnicos (OPERADOR)
  const tecnicos = await prisma.tenantMembership.findMany({
    where: {
      tenantId: TENANT_ID,
      role: Role.OPERADOR,
      empresaMemberships: { some: { empresaId: EMPRESA_ID } }
    },
    include: { user: true }
  });

  if (tecnicos.length === 0) {
    console.error('❌ No hay técnicos OPERADOR en esta empresa. Ejecuta users-seed.ts primero.');
    return;
  }
  console.log(`✅ Técnicos para asignar: ${tecnicos.length}`);

  // 5. Generar Órdenes de Servicio y Declaraciones de Efectivo
  console.log('📝 Generando órdenes y saldos pendientes...');
  
  for (let i = 0; i < 12; i++) {
    const cliente = clientes[i % clientes.length];
    const servicio = servicios[i % servicios.length];
    const tecnico = tecnicos[i % tecnicos.length];
    const metodo = metodosPago[i % metodosPago.length]; // Rotamos métodos para tener variedad
    
    const valorCotizado = 120000 + (i * 15000);
    const numOrden = `OS-2026-${String(100 + i)}`;

    const orden = await prisma.ordenServicio.create({
      data: {
        tenantId: TENANT_ID,
        empresaId: EMPRESA_ID,
        clienteId: cliente!.id,
        servicioId: servicio!.id,
        tecnicoId: tecnico!.id,
        metodoPagoId: metodo!.id,
        direccionTexto: 'Dirección de prueba # ' + i,
        valorCotizado,
        estadoServicio: EstadoOrden.TECNICO_FINALIZO, // Marcamos como finalizado para que cuente como recaudo pendiente
        fechaVisita: new Date(),
        horaInicio: new Date(),
        numeroOrden: numOrden,
      }
    });

    // Si el método es EFECTIVO, creamos la declaración para que aparezca en "Recaudo Efectivo"
    if (metodo!.nombre === 'EFECTIVO') {
      await prisma.declaracionEfectivo.create({
        data: {
          tenantId: TENANT_ID,
          empresaId: EMPRESA_ID,
          ordenId: orden.id,
          tecnicoId: tecnico!.id,
          valorDeclarado: valorCotizado,
          evidenciaPath: 'https://via.placeholder.com/150?text=Evidencia+Efectivo',
          consignado: false,
          observacion: 'Dinero recibido en efectivo por el técnico.',
        }
      });
      console.log(`   💵 [EFECTIVO] Orden ${numOrden} -> Saldo pendiente para ${tecnico!.user.nombre}`);
    } else {
      console.log(`   ✅ [${metodo!.nombre}] Orden ${numOrden} creada.`);
    }
  }

  console.log('\n✨ Proceso completado. Ahora puedes ver los datos en el Dashboard.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
