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

async function testLoginNewUser() {
  const { data, error } = await client.auth.signInWithPassword({
    email: 'teste_user_1795095439790@cptm.sp.gov.br',
    password: 'Password@123456',
  });

  console.log('Login result for new user:', {
    userId: data?.user?.id,
    email: data?.user?.email,
    error: error?.message || error
  });

  // Consulta o perfil do próprio usuário
  const { data: profile } = await client.from('admin_profiles').select('*').eq('id', data.user.id).single();
  console.log('Profile do usuário logado:', profile);
}

testLoginNewUser().catch(console.error);

