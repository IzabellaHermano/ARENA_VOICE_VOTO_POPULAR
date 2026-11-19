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

async function testEventAdmins() {
  await client.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  // Test inserting an assignment for the test user into event_admins
  const testUserId = 'f7efad47-a74f-49c8-832c-e9f78356880e';
  const testEventId = 'evento-caua-mwnili8h';

  const { data: insData, error: insErr } = await client.from('event_admins').insert({
    event_id: testEventId,
    user_id: testUserId,
  }).select('*');

  console.log('Insert event_admins result:', insData, insErr);

  const { data: listData, error: listErr } = await client.from('event_admins').select('*');
  console.log('List event_admins:', listData, listErr);

  // Clean up test assignment
  await client.from('event_admins').delete().eq('user_id', testUserId);
  console.log('Cleaned up test assignment.');
}

testEventAdmins().catch(console.error);

