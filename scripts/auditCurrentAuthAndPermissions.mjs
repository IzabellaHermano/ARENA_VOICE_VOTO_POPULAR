import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

async function audit() {
  console.log('='.repeat(80));
  console.log('AUDITORIA DE ESTRUTURA ATUAL — ETAPA 2');
  console.log('='.repeat(80));

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Sign in as admin
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  if (authErr) {
    console.error('Falha no login admin:', authErr.message);
    return;
  }
  console.log('Admin autenticado:', authData.user.email, 'ID:', authData.user.id);

  // 2. Query admin_profiles
  const { data: profiles, error: profErr } = await client.from('admin_profiles').select('*');
  console.log('\n--- ADMIN PROFILES ---');
  if (profErr) console.error('Erro ao ler admin_profiles:', profErr.message);
  else console.log(profiles);

  // 3. Query events
  const { data: events, error: evErr } = await client.from('events').select('*');
  console.log('\n--- EVENTS ---');
  if (evErr) console.error('Erro ao ler events:', evErr.message);
  else console.log(events);

  // 4. Check if event_admins table exists
  const { data: eventAdmins, error: eaErr } = await client.from('event_admins').select('*');
  console.log('\n--- EVENT_ADMINS ---');
  if (eaErr) {
    console.log('Tabela event_admins NÃO EXISTE ou erro:', eaErr.message);
  } else {
    console.log('Tabela event_admins EXISTE! Registros:', eventAdmins);
  }

  // 5. Test public.is_admin() and public.is_superadmin() via RPC if callable or query
  const { data: isAdm, error: admErr } = await client.rpc('is_admin');
  console.log('\n--- RPC is_admin() ---');
  if (admErr) console.log('RPC is_admin error:', admErr.message);
  else console.log('RPC is_admin:', isAdm);

  const { data: isSup, error: supErr } = await client.rpc('is_superadmin');
  console.log('\n--- RPC is_superadmin() ---');
  if (supErr) console.log('RPC is_superadmin error:', supErr.message);
  else console.log('RPC is_superadmin:', isSup);
}

audit();

