// Ejecuta la migración 001 vía REST API de Supabase
// Como no podemos hacer DDL via REST, usamos el truco:
// - Si ya se aplicó, falla con "duplicate column" — lo detectamos y seguimos
// - Si no, usamos un workaround: la mayoría de DDL via REST no es posible
//
// En la práctica: lo que SI podemos hacer via REST es:
//   - SELECT, INSERT, UPDATE, DELETE
//   - CREATE FUNCTION (limitado)
//
// Para ALTER TABLE necesitamos SQL Editor del dashboard.
// Pero podemos verificar si la columna existe via information_schema via RPC.
//
// ESTE SCRIPT SOLO INFORMA. La migración debe correrla César en SQL Editor.
import 'dotenv/config';
import { getSupabase } from '../adapters/supabaseClient';

async function main() {
  const sb = getSupabase();

  // Verificar si la columna ya existe usando un truco: insertar un cliente con cedula
  const { error } = await sb
    .from('clientes')
    .insert({
      tenant_id: '__test_inexistente__',
      telefono: '+0000000000',
      nombre: '__test_migracion_001__',
      cedula: 'TEST',
    });

  if (error?.message?.includes('column "cedula" does not exist')) {
    console.log('ESTADO: cedula NO EXISTE');
    console.log('ACCION: correr backend/sql/migration-001-cedula.sql en SQL Editor');
    process.exit(0);
  }
  if (error?.message?.includes('violates foreign key')) {
    console.log('ESTADO: cedula YA EXISTE');
    console.log('INFO: la columna cedula ya fue agregada al schema');
    process.exit(0);
  }
  if (error) {
    console.log('OTRO ERROR:', error.message);
    process.exit(1);
  }
  // Si no hubo error, significa que se insertó (raro). Limpiar.
  await sb.from('clientes').delete().eq('tenant_id', '__test_inexistente__');
  console.log('ESTADO: incierto (insert exitoso, limpiando)');
  process.exit(0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
