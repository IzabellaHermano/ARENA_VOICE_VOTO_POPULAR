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

const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
  email: 'admin@cptm.sp.gov.br',
  password: '123456'
});

if (authErr) {
  console.error('Auth error:', authErr);
  process.exit(1);
}

const { error: delErr } = await supabase.from('events').delete().eq('id', 'teste-evento-mwf3or7h');
console.log('Delete result:', delErr ? delErr.message : 'SUCCESS');

const { data: remaining } = await supabase.from('events').select('id, name');
console.log('Remaining events in DB:', remaining);
