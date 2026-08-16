// Lee el archivo SQL y lo ejecuta contra Postgres
import 'dotenv/config';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  let dbUrl = process.env.SUPABASE_DB_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!dbUrl && password && supabaseUrl) {
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
    process.exit(1);
  }

  const archivo = process.argv[2];
  if (!archivo) {
    console.log('USO: npx ts-node ejecutarSql.ts <archivo.sql>');
    process.exit(1);
  }

  const fullPath = path.resolve(archivo);
  const sql = fs.readFileSync(fullPath, 'utf8');

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log('CONEXION_OK');
    console.log('EJECUTANDO:', fullPath);
    await client.query(sql);
    console.log('SQL_OK');
    await client.end();
  } catch (e: any) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

main();
