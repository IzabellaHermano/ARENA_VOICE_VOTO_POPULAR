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

const tempClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function testSignUp() {
  const testEmail = 'teste_user_' + Date.now() + '@cptm.sp.gov.br';
  const { data, error } = await tempClient.auth.signUp({
    email: testEmail,
    password: 'Password@123456',
    options: {
      data: { name: 'Usuario Teste', role: 'operator' }
    }
  });
  console.log('signUp result:', {
    userId: data?.user?.id,
    email: data?.user?.email,
    identities: data?.user?.identities?.length,
    error: error?.message || error
  });
}
testSignUp().catch(console.error);

