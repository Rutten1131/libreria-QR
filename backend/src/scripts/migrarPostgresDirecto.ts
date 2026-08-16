// Intenta conectar directo a Postgres.
// Soporta dos formas:
//   - SUPABASE_DB_PASSWORD: password solo, arma URL desde SUPABASE_URL
//   - SUPABASE_DB_URL: connection string completa
import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  let dbUrl = process.env.SUPABASE_DB_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!dbUrl && password && supabaseUrl) {
    // Extraer ref de SUPABASE_URL: https://hbqkcawfkqpyttjiumtp.supabase.co
    const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (!match) {
      console.log('ERROR: no se pudo extraer ref de SUPABASE_URL');
      process.exit(1);
    }
    const ref = match[1];
    dbUrl = `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
  }

  if (!dbUrl) {
    console.log('NO_PASSWORD_PROVIDED');
    console.log('OPCION A: SUPABASE_DB_PASSWORD + SUPABASE_URL en .env');
    console.log('OPCION B: SUPABASE_DB_URL completa en .env');
    process.exit(0);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log('CONEXION_OK');

    const sql = `
      ALTER TABLE clientes
        ADD COLUMN IF NOT EXISTS cedula TEXT;

      UPDATE clientes SET cedula = 'PENDIENTE-' || id::text WHERE cedula IS NULL;

      ALTER TABLE clientes
        ALTER COLUMN cedula SET NOT NULL;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_tenant_cedula_unique') THEN
          ALTER TABLE clientes
            ADD CONSTRAINT clientes_tenant_cedula_unique UNIQUE (tenant_id, cedula);
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_clientes_tenant_cedula
        ON clientes(tenant_id, cedula);
    `;

    await client.query(sql);
    console.log('MIGRACION_OK');

    const { rows } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'clientes' AND column_name = 'cedula'
    `);
    console.log('VERIFICACION:', rows);

    await client.end();
  } catch (e: any) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

main();
