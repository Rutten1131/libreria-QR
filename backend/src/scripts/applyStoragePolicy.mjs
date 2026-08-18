import pg from 'pg';

const connectionString = 'postgresql://postgres:A1RnvD8H85Z5bgn9@db.hbqkcawfkqpyttjiumtp.supabase.co:5432/postgres';

async function main() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log('Conectado a PostgreSQL Supabase ✅');

  const sql = `
    -- Permitir lectura publica a listas_escolares
    DROP POLICY IF EXISTS "Public Access listas_escolares" ON storage.objects;
    CREATE POLICY "Public Access listas_escolares" ON storage.objects
      FOR SELECT
      USING (bucket_id = 'listas_escolares');

    -- Permitir subida publica a listas_escolares
    DROP POLICY IF EXISTS "Public Upload listas_escolares" ON storage.objects;
    CREATE POLICY "Public Upload listas_escolares" ON storage.objects
      FOR INSERT
      WITH CHECK (bucket_id = 'listas_escolares');

    -- Permitir actualizacion/upsert
    DROP POLICY IF EXISTS "Public Update listas_escolares" ON storage.objects;
    CREATE POLICY "Public Update listas_escolares" ON storage.objects
      FOR UPDATE
      USING (bucket_id = 'listas_escolares');
  `;

  await client.query(sql);
  console.log('Políticas RLS creadas exitosamente para storage.objects (listas_escolares) ✅');
  await client.end();
}

main().catch(console.error);
