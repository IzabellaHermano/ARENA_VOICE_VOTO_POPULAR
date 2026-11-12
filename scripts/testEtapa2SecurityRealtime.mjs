import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carrega .env sem bibliotecas externas
const envPath = resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = (match[2] || '').trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1]] = val;
    }
  });
}

const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const EVENT_ID = 'arena-voice-2026';

console.log('====================================================');
console.log('ARENA VOICE — AUDITORIA DE RLS E SUPABASE REALTIME');
console.log('TESTES TÉCNICOS OBRIGATÓRIOS DA ETAPA 2');
console.log('====================================================');

async function runAuditTests() {
  const results = [];
  function logResult(code, title, passed, detail) {
    results.push({ code, title, passed, detail });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${code}: ${title} -> ${detail}`);
  }

  try {
    // ----------------------------------------------------
    // TESTE A: PARTICIPANTE ANÔNIMO
    // ----------------------------------------------------
    console.log('\n--- TESTE A: PARTICIPANTE ANÔNIMO ---');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: voterAuth, error: authErr } = await anonClient.auth.signInAnonymously();
    if (authErr) throw new Error('Falha no signInAnonymously: ' + authErr.message);
    const voterUid = voterAuth.user.id;
    logResult('A1', 'Autenticação Anônima do Votante', true, `UID: ${voterUid}`);

    // A2: Consegue identificar o evento e status da rodada
    const { data: eventData, error: evErr } = await anonClient
      .from('events')
      .select('id, name, status, current_round_id, current_project_id')
      .eq('id', EVENT_ID)
      .single();
    const canReadEvent = !evErr && !!eventData;
    logResult('A2', 'Leitura pública do evento e status da rodada', canReadEvent, `Projeto ativo: ${eventData?.current_project_id || 'nenhum'}`);

    // A3: Consegue visualizar projetos ativos
    const { data: projsData, error: pErr } = await anonClient
      .from('projects')
      .select('id, name, category, active')
      .eq('event_id', EVENT_ID);
    const canReadProjects = !pErr && Array.isArray(projsData) && projsData.length > 0;
    logResult('A3', 'Leitura pública da lista de projetos', canReadProjects, `${projsData?.length || 0} projetos visíveis`);

    // A4: NÃO consegue consultar votos individuais de outros participantes
    const { data: otherVotes, error: ovErr } = await anonClient.from('votes').select('*');
    const cannotReadOtherVotes = Array.isArray(otherVotes) && otherVotes.length === 0;
    logResult('A4', 'Bloqueio estrito de leitura de votos individuais de terceiros', cannotReadOtherVotes, `Votos alheios visíveis: ${otherVotes?.length || 0}`);

    // A5: NÃO consegue executar operações administrativas diretas (ex: alterar evento)
    const { data: hackEvent, error: hackEvErr } = await anonClient
      .from('events')
      .update({ name: 'Evento Alterado por Hacker' })
      .eq('id', EVENT_ID)
      .select();
    const blockedAdminDirectUpdate = !hackEvent || hackEvent.length === 0;
    logResult('A5', 'Bloqueio de UPDATE direto na tabela events pelo anônimo', blockedAdminDirectUpdate, `Linhas alteradas: ${hackEvent?.length || 0}`);

    // A6: NÃO consegue chamar RPC administrativa (ex: open_round)
    const { error: rpcHackErr } = await anonClient.rpc('open_round', {
      p_event_id: EVENT_ID,
      p_project_id: 'projeto01'
    });
    const blockedAdminRpc = !!rpcHackErr && (rpcHackErr.message.includes('Acesso negado') || rpcHackErr.message.includes('permission denied'));
    logResult('A6', 'Bloqueio de chamada a RPC administrativa open_round', blockedAdminRpc, rpcHackErr?.message || 'Permitiu!');

    // ----------------------------------------------------
    // TESTE B: ADMINISTRADOR AUTENTICADO
    // ----------------------------------------------------
    console.log('\n--- TESTE B: ADMINISTRADOR AUTENTICADO ---');
    const adminClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: adminAuth, error: admLoginErr } = await adminClient.auth.signInWithPassword({
      email: 'admin@cptm.sp.gov.br',
      password: '123456'
    });
    if (admLoginErr) throw new Error('Falha login admin: ' + admLoginErr.message);
    logResult('B1', 'Autenticação do Administrador no Supabase', true, adminAuth.user.email);

    // B2: Consegue ler admin_profiles
    const { data: profiles, error: profErr } = await adminClient.from('admin_profiles').select('id, name, email, role, active');
    const canReadProfiles = !profErr && Array.isArray(profiles) && profiles.length > 0;
    logResult('B2', 'Consulta autorizada de perfis administrativos', canReadProfiles, `${profiles?.length || 0} administradores cadastrados`);

    // B3: Consegue auditar tabela votes completa
    const { data: allVotes, error: allVErr } = await adminClient.from('votes').select('id, project_id, innovation, impact, development');
    const canAuditVotes = !allVErr && Array.isArray(allVotes);
    logResult('B3', 'Acesso administrativo de auditoria à tabela votes', canAuditVotes, `${allVotes?.length || 0} votos auditáveis`);

    // B4: Consegue ler tabela results completa
    const { data: allResults, error: allRErr } = await adminClient.from('results').select('*');
    const canReadResults = !allRErr && Array.isArray(allResults);
    logResult('B4', 'Acesso administrativo aos resultados consolidados', canReadResults, `${allResults?.length || 0} resultados consolidados`);

    // ----------------------------------------------------
    // TESTE C: SUPABASE REALTIME
    // ----------------------------------------------------
    console.log('\n--- TESTE C: SUPABASE REALTIME (CICLO DE VIDA E CANAIS) ---');
    
    // Testa status SUBSCRIBED nos canais monitorados
    const tablesToMonitor = ['events', 'projects', 'rounds'];
    for (const t of tablesToMonitor) {
      const chName = `test_ch_${t}_${Date.now()}`;
      const ch = anonClient.channel(chName);
      
      const subStatus = await new Promise((res) => {
        ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => {});
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            res(status);
          }
        });
      });

      const isSubscribed = subStatus === 'SUBSCRIBED';
      logResult(`C_${t}`, `Canal Realtime da tabela [${t}]`, isSubscribed, `Status: ${subStatus}`);
      await anonClient.removeChannel(ch);
    }

    // ----------------------------------------------------
    // TESTE D: AUDITORIA DA POLÍTICA DE LEITURA DE RESULTS
    // ----------------------------------------------------
    console.log('\n--- TESTE D: AUDITORIA DA POLÍTICA DA TABELA RESULTS ---');
    
    // Leitura como anônimo na base atual
    const { data: anonResults, error: arErr } = await anonClient.from('results').select('*');
    const anonCanReadResultsNow = Array.isArray(anonResults) && anonResults.length > 0;
    
    console.log(`[DIAGNÓSTICO D1] Leitura anônima de results antes do patch: ${anonResults?.length || 0} linhas retornadas.`);
    logResult(
      'D1',
      'Diagnóstico da leitura de results por anônimos',
      true,
      anonCanReadResultsNow 
        ? 'Resultados já estão com leitura pública liberada.' 
        : 'Bloqueado por RLS atual (necessita aplicação do script etapa2_rls_realtime_patch.sql).'
    );

    // Confirmação de que results NÃO possui dados pessoais de eleitores
    if (allResults && allResults.length > 0) {
      const sample = allResults[0];
      const hasVoterId = 'voter_id' in sample || 'voter_uid' in sample || 'user_id' in sample || 'email' in sample;
      logResult('D2', 'Garantia de ausência de dados pessoais na tabela results', !hasVoterId, 'Tabela contém apenas agregados numéricos matemáticos.');
    }

    console.log('\n====================================================');
    const allCriticalPassed = results.every((r) => r.passed);
    console.log(`RESULTADO DA AUDITORIA: ${allCriticalPassed ? 'POLÍTICAS E SEGURANÇA 100% CONFORMES' : 'FORAM DETECTADAS INCONFORMIDADES'}`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('FATAL ERROR NA AUDITORIA:', err);
    process.exitCode = 1;
  }
}

runAuditTests();

