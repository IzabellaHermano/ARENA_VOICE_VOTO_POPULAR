import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve('.env');
let supabaseUrl = '';
let supabaseAnonKey = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = trimmed.replace('VITE_SUPABASE_URL=', '').trim();
    }
    if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = trimmed.replace('VITE_SUPABASE_ANON_KEY=', '').trim();
    }
  });
}

supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Signing in to perform global sign out...');
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@cptm.sp.gov.br',
  password: '123456'
});

if (error) {
  console.error('Sign in error:', error);
  process.exit(1);
}

console.log('Signed in. Calling signOut with scope: global...');
const { error: signoutErr } = await supabase.auth.signOut({ scope: 'global' });
console.log('Signout result:', signoutErr ? signoutErr.message : 'SUCCESS');

