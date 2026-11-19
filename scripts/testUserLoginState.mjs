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

async function checkUserLogin() {
  const loginRes = await client.auth.signInWithPassword({
    email: 'teste_user_1795095439790@cptm.sp.gov.br',
    password: 'Password@123456',
  });
  console.log('Login result:', loginRes.error ? loginRes.error.message : 'LOGOU COM SUCESSO: ' + loginRes.data.user.id);
}
checkUserLogin().catch(console.error);

