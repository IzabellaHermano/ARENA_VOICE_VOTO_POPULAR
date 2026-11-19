import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .forEach((l) => {
    const idx = l.indexOf('=');
    if (idx !== -1) {
      let val = l.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[l.slice(0, idx).trim()] = val;
    }
  });

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runEtapa2Validation() {
  console.log('='.repeat(80));
  console.log('ARENA VOICE — VALIDAÇÃO TÉCNICA OFICIAL ETAPA 2: USUÁRIOS, VÍNCULOS E RBAC');
  console.log('='.repeat(80));

  // 1. Autenticação do Superadmin
  console.log('\n--- TESTE 1: AUTENTICAÇÃO DO SUPERADMINISTRADOR ---');
  const superClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: authErr } = await superClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });
  assert(!authErr && authData.user, 'Superadministrador autenticado com sucesso no Supabase');
  console.log('Superadmin UID:', authData.user.id, '| E-mail:', authData.user.email);

  const { data: superProfile } = await superClient
    .from('admin_profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();
  assert(superProfile && superProfile.role === 'superadmin', 'Perfil possui papel global "superadmin"');

  // 2. Gestão de Contas e Perfis Reais
  console.log('\n--- TESTE 2: GESTÃO E PERSISTÊNCIA REAL DE USUÁRIOS NO SUPABASE ---');
  const adminUid = 'f7efad47-a74f-49c8-832c-e9f78356880e';
  const operatorUid = 'c21cb456-b2ec-4cc0-a7d4-acde71b86e4c';

  // 2.1 Cadastra/Atualiza Gestor (Admin)
  const { data: adminProfRpc, error: adminProfErr } = await superClient.rpc('admin_manage_profile', {
    p_action: 'create',
    p_user_id: adminUid,
    p_name: 'Gestor Regional de Inovação',
    p_email: 'gestor_regional@cptm.sp.gov.br',
    p_role: 'admin',
    p_active: true,
  });
  assert(!adminProfErr && adminProfRpc.success, 'Perfil de Administrador persistido em admin_profiles via RPC');

  // 2.2 Cadastra/Atualiza Operador
  const { data: opProfRpc, error: opProfErr } = await superClient.rpc('admin_manage_profile', {
    p_action: 'create',
    p_user_id: operatorUid,
    p_name: 'Operador de Palco Local',
    p_email: 'operador_palco@cptm.sp.gov.br',
    p_role: 'operator',
    p_active: true,
  });
  assert(!opProfErr && opProfRpc.success, 'Perfil de Operador persistido em admin_profiles via RPC');

  // 2.3 Atualização de Dados Cadastrais
  const { data: updateRes, error: updateErr } = await superClient.rpc('admin_manage_profile', {
    p_action: 'update',
    p_user_id: adminUid,
    p_name: 'Gestor Regional CPTM Atualizado',
    p_role: 'admin',
    p_active: true,
  });
  assert(!updateErr && updateRes.success, 'Atualização de nome do Administrador persistida com sucesso');

  // 2.4 Alternância de Situação (Ativo / Inativo)
  const { data: toggleRes, error: toggleErr } = await superClient.rpc('admin_manage_profile', {
    p_action: 'toggle_active',
    p_user_id: adminUid,
    p_active: false,
  });
  assert(!toggleErr && toggleRes.success, 'Desativação de conta administrativa executada via RPC');

  // Reativa
  await superClient.rpc('admin_manage_profile', {
    p_action: 'toggle_active',
    p_user_id: adminUid,
    p_active: true,
  });

  // 3. Vínculo de Usuários aos Eventos
  console.log('\n--- TESTE 3: GESTÃO DE VÍNCULOS MULTI-EVENTO ---');
  const { data: eventsList } = await superClient.from('events').select('id, name').limit(2);
  assert(eventsList && eventsList.length >= 2, 'Pelo menos 2 eventos existentes encontrados no banco');
  const eventA = eventsList[0].id;
  const eventB = eventsList[1].id;
  console.log(`Evento A: ${eventsList[0].name} (${eventA})`);
  console.log(`Evento B: ${eventsList[1].name} (${eventB})`);

  // Limpa vínculos anteriores de teste
  await superClient.from('event_admins').delete().eq('user_id', adminUid);
  await superClient.from('event_admins').delete().eq('user_id', operatorUid);

  // 3.1 Vincula Gestor exclusivamente ao Evento A
  const { data: asgAdminA, error: asgAdminAErr } = await superClient
    .from('event_admins')
    .insert({
      event_id: eventA,
      user_id: adminUid,
      granted_by: authData.user.id,
    })
    .select('*')
    .single();
  assert(!asgAdminAErr && asgAdminA, 'Administrador vinculado com sucesso ao Evento A');

  // 3.2 Vincula Operador aos Eventos A e B
  const { data: asgOpA, error: asgOpAErr } = await superClient
    .from('event_admins')
    .insert({
      event_id: eventA,
      user_id: operatorUid,
      granted_by: authData.user.id,
    })
    .select('*')
    .single();
  assert(!asgOpAErr && asgOpA, 'Operador vinculado com sucesso ao Evento A');

  const { data: asgOpB, error: asgOpBErr } = await superClient
    .from('event_admins')
    .insert({
      event_id: eventB,
      user_id: operatorUid,
      granted_by: authData.user.id,
    })
    .select('*')
    .single();
  assert(!asgOpBErr && asgOpB, 'Operador vinculado com sucesso ao Evento B (multi-evento comprovado)');

  // 3.3 Consulta de Vínculos por Usuário
  const { data: checkAdminAsg } = await superClient
    .from('event_admins')
    .select('*')
    .eq('user_id', adminUid);
  assert(checkAdminAsg.length === 1 && checkAdminAsg[0].event_id === eventA, 'Administrador possui 1 evento vinculado (Evento A)');

  const { data: checkOpAsg } = await superClient
    .from('event_admins')
    .select('*')
    .eq('user_id', operatorUid);
  assert(checkOpAsg.length === 2, 'Operador possui 2 eventos vinculados independentemente');

  // 4. Auditoria de Acesso e Isolamento RBAC
  console.log('\n--- TESTE 4: AUDITORIA DE ACESSO E ISOLAMENTO RBAC ---');
  // has_event_access via RPC oficial
  const { data: superHasA } = await superClient.rpc('has_event_access', { p_event_id: eventA, p_user_id: authData.user.id });
  const { data: superHasB } = await superClient.rpc('has_event_access', { p_event_id: eventB, p_user_id: authData.user.id });
  assert(superHasA === true && superHasB === true, 'Superadministrador possui acesso universal aos eventos A e B');

  const { data: adminHasA } = await superClient.rpc('has_event_access', { p_event_id: eventA, p_user_id: adminUid });
  const { data: adminHasB } = await superClient.rpc('has_event_access', { p_event_id: eventB, p_user_id: adminUid });
  assert(adminHasA === true, 'Administrador possui acesso autorizado ao Evento A');
  assert(adminHasB === false, 'Administrador NÃO possui acesso ao Evento B (isolamento estrito comprovado)');

  const { data: opHasA } = await superClient.rpc('has_event_access', { p_event_id: eventA, p_user_id: operatorUid });
  const { data: opHasB } = await superClient.rpc('has_event_access', { p_event_id: eventB, p_user_id: operatorUid });
  assert(opHasA === true && opHasB === true, 'Operador possui acesso confirmado a ambos os eventos vinculados');

  // 5. Revogação de Acesso
  console.log('\n--- TESTE 5: REVOGAÇÃO DE ACESSO E ATUALIZAÇÃO IMEDIATA ---');
  const { error: revokeErr } = await superClient
    .from('event_admins')
    .delete()
    .eq('event_id', eventA)
    .eq('user_id', operatorUid);
  assert(!revokeErr, 'Vínculo do Operador com o Evento A revogado com sucesso');

  const { data: opHasAAfterRevoke } = await superClient.rpc('has_event_access', { p_event_id: eventA, p_user_id: operatorUid });
  const { data: opHasBAfterRevoke } = await superClient.rpc('has_event_access', { p_event_id: eventB, p_user_id: operatorUid });
  assert(opHasAAfterRevoke === false, 'Acesso do Operador ao Evento A imediatamente bloqueado após revogação');
  assert(opHasBAfterRevoke === true, 'Acesso do Operador ao Evento B preservado intacto');

  // 6. Limpeza e Exclusão Segura
  console.log('\n--- TESTE 6: LIMPEZA DAS CONTAS TEMPORÁRIAS DE TESTE ---');
  await superClient.from('event_admins').delete().eq('user_id', adminUid);
  await superClient.from('event_admins').delete().eq('user_id', operatorUid);

  const { data: delAdminRes } = await superClient.rpc('admin_manage_profile', { p_action: 'delete', p_user_id: adminUid });
  assert(delAdminRes && delAdminRes.success, 'Perfil de Administrador excluído com sucesso');

  const { data: delOpRes } = await superClient.rpc('admin_manage_profile', { p_action: 'delete', p_user_id: operatorUid });
  assert(delOpRes && delOpRes.success, 'Perfil de Operador excluído com sucesso');

  const { data: finalProfiles } = await superClient.from('admin_profiles').select('*');
  console.log(`Perfis finais em admin_profiles: ${finalProfiles.length}`);
  assert(finalProfiles.length === 1 && finalProfiles[0].email === 'admin@cptm.sp.gov.br', 'Banco restaurado ao estado limpo original');

  console.log('\n' + '='.repeat(80));
  console.log('TODOS OS 16 TESTES DA ETAPA 2 PASSARAM COM 100% DE SUCESSO!');
  console.log('='.repeat(80));
}

runEtapa2Validation().catch((err) => {
  console.error('\nFALHA NA VALIDAÇÃO DA ETAPA 2:', err);
  process.exit(1);
});
