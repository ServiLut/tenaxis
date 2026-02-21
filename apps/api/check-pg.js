const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: false
});

async function run() {
  const tenantId = '0d003940-5049-4ebe-86f8-d62605e26a93';
  const empresaId = '05cefa1d-5018-4b9f-a5ee-96cd29c6eed0';
  await pool.query(
    'INSERT INTO clientes ("id", "tenantId", "empresaId", "nombre", "telefono", "numeroDocumento", "tipoCliente", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())',
    [tenantId, empresaId, 'Cliente de Prueba', '555555555', '123456789', 'PERSONA']
  );
  console.log('Inserted dummy client');
  pool.end();
}
run();