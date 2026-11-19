import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let v = match[2] || '';
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[match[1]] = v.trim();
  }
});

const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkCols() {
  await client.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  const testCols = ['id', 'event_id', 'user_id', 'role', 'granted_by', 'created_at'];
  for (const col of testCols) {
    const { data, error } = await client.from('event_admins').select(col).limit(1);
    console.log(`Coluna "${col}":`, error ? `NÃO EXISTE (${error.message})` : 'EXISTE');
  }
}
checkCols().catch(console.error);

