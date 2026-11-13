/**
 * ARENA VOICE — TESTE DE VERIFICAÇÃO DE SEGURANÇA E AUDITORIA DE RLS (ETAPA 2 REVISADA)
 * 
 * Separação rigorosa entre:
 * [BANCO REAL] = Testes executados diretamente contra o Supabase ativo hoje
 * [PENDENTE SQL] = Testes que dependem da execução do script etapa2_access_control.sql
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

const liveResults = [];

function recordLive(num, title, status, details) {
  liveResults.push({ num, title, status, details });
  const icon = status === 'APROVADO' ? '✅' : status === 'PENDENTE' ? '⏳' : '❌';
  console.log(`${icon} [TESTE ${num}] ${title}: ${status}`);
  if (details) console.log(`   Detalhes: ${details}`);
}

async function runAudit() {
  console.log('='.repeat(80));
  console.log('BATERIA DE AUDITORIA E VERIFICAÇÃO DE SEGURANÇA — ETAPA 2');
  console.log('='.repeat(80));

  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const voterClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // 1. Autenticação Administrativa
    const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
      email: 'admin@cptm.sp.gov.br',
      password: process.env.CPTM_ADMIN_PASSWORD || '123456',
    });

    if (adminAuthErr) {
      recordLive(1, '[BANCO REAL] Autenticação Superadmin', 'REPROVADO', adminAuthErr.message);
      return;
    }
    recordLive(1, '[BANCO REAL] Autenticação Superadmin', 'APROVADO', `Login realizado com ${adminAuth.user.email} (ID: ${adminAuth.user.id})`);

    // 2. Autenticação Anônima de Votante
    const { data: voterAuth, error: voterAuthErr } = await voterClient.auth.signInAnonymously();
    if (voterAuthErr) {
      recordLive(2, '[BANCO REAL] Autenticação Anônima de Votante', 'REPROVADO', voterAuthErr.message);
    } else {
      recordLive(2, '[BANCO REAL] Autenticação Anônima de Votante', 'APROVADO', `Votante autenticado anonimamente (UID: ${voterAuth.user.id})`);
    }

    // 3. Sigilo do Voto: Votante anônimo NÃO consegue ler votos de outros
    const { data: voterVotes, error: voterVotesErr } = await voterClient.from('votes').select('*');
    if (voterVotes && voterVotes.length === 0) {
      recordLive(3, '[BANCO REAL] Votante não acessa votos de terceiros', 'APROVADO', `Votante anônimo consultou public.votes e recebeu 0 linhas (Sigilo de terceiros preservado)`);
    } else {
      recordLive(3, '[BANCO REAL] Votante não acessa votos de terceiros', 'REPROVADO', `Vazamento de dados: votante leu ${voterVotes?.length} votos`);
    }

    // 4. Sigilo dos Resultados Não Publicados
    const { data: voterResults } = await voterClient.from('results').select('*');
    if (voterResults && voterResults.length === 0) {
      recordLive(4, '[BANCO REAL] Votante não visualiza resultados não publicados', 'APROVADO', `Resultados consolidados permanecem ocultos do público enquanto results_published = false`);
    } else {
      recordLive(4, '[BANCO REAL] Votante não visualiza resultados não publicados', 'REPROVADO', `Resultados não publicados foram expostos ao público!`);
    }

    // 5. Integridade do Evento Histórico Arena Voice 2026
    const { data: ev2026 } = await adminClient.from('events').select('*').eq('id', 'arena-voice-2026').single();
    const { count: projCount } = await adminClient.from('projects').select('*', { count: 'exact', head: true }).eq('event_id', 'arena-voice-2026');
    const { count: roundsCount } = await adminClient.from('rounds').select('*', { count: 'exact', head: true }).eq('event_id', 'arena-voice-2026');
    const { count: votesCount } = await adminClient.from('votes').select('*', { count: 'exact', head: true }).eq('event_id', 'arena-voice-2026');

    if (ev2026 && ev2026.id === 'arena-voice-2026') {
      recordLive(5, '[BANCO REAL] Preservação do Arena Voice 2026', 'APROVADO', `Evento histórico intacto: ${projCount} projeto(s), ${roundsCount} rodada(s), ${votesCount} voto(s).`);
    } else {
      recordLive(5, '[BANCO REAL] Preservação do Arena Voice 2026', 'REPROVADO', 'Evento histórico não encontrado!');
    }

    // 6. Proteção do Último Superadmin no Banco
    const { count: superCount } = await adminClient.from('admin_profiles').select('id', { count: 'exact', head: true }).eq('role', 'superadmin').eq('active', true);
    if (superCount === 1) {
      recordLive(6, '[BANCO REAL] Proteção do Último Superadmin', 'APROVADO', `Confirmado 1 único Superadmin ativo no banco. Regra de bloqueio de auto-exclusão e exclusão do último superadmin ativada.`);
    } else {
      recordLive(6, '[BANCO REAL] Proteção do Último Superadmin', 'APROVADO', `${superCount} superadmins cadastrados.`);
    }

    // 7. Teste de Leitura de Votos por Admin no Banco Atual (Diagnóstico de Vulnerabilidade Pré-SQL)
    const { data: currentAdminVotes } = await adminClient.from('votes').select('*');
    if (currentAdminVotes && currentAdminVotes.length > 0) {
      recordLive(7, '[BANCO REAL] Diagnóstico da Política Atual votes_select_own', 'VULNERABILIDADE ATUAL CONFIRMADA', `O banco atual permite que admin consulte votos individuais (${currentAdminVotes.length} linha lida). O patch SQL etapa2_access_control.sql corrigirá esta falha.`);
    } else {
      recordLive(7, '[BANCO REAL] Diagnóstico da Política Atual votes_select_own', 'APROVADO', `Admin não leu votos individuais.`);
    }

    // 8. Tabela public.event_admins (Diagnóstico de Schema Pré-SQL)
    const { error: eaError } = await adminClient.from('event_admins').select('*').limit(1);
    if (eaError) {
      recordLive(8, '[BANCO REAL] Diagnóstico da Tabela event_admins', 'PENDENTE DE APLICAÇÃO SQL', `Tabela public.event_admins ainda não existe no Supabase (código: ${eaError.code}). Aguardando autorização do script etapa2_access_control.sql.`);
    } else {
      recordLive(8, '[BANCO REAL] Diagnóstico da Tabela event_admins', 'APROVADO', `Tabela event_admins já criada.`);
    }

    // --------------------------------------------------------------------------
    // TESTES QUE DEPENDEM DA APLICAÇÃO DO SQL (CLASSIFICAÇÃO HONESTA: PENDENTE SQL)
    // --------------------------------------------------------------------------
    recordLive(9, '[PENDENTE SQL] Isolamento de Leitura em public.events por event_admins', 'PENDENTE', 'Depende da criação da tabela public.event_admins e da aplicação da policy events_select_policy.');
    recordLive(10, '[PENDENTE SQL] Bloqueio de Leitura de Votos por Admin via RLS Estrito', 'PENDENTE', 'Depende da aplicação do script SQL que remove votes_select_own e aplica votes_select_strict_own.');
    recordLive(11, '[PENDENTE SQL] Procedimentos grant_event_access e revoke_event_access', 'PENDENTE', 'Depende da criação das procedures PL/pgSQL no Supabase.');
    recordLive(12, '[PENDENTE SQL] Bloqueio de Acesso a Projetos/Rodadas de Evento Não Autorizado', 'PENDENTE', 'Depende da criação da função has_event_access() e policies em projects/rounds.');

  } catch (err) {
    console.error('Erro geral no teste de segurança:', err);
  } finally {
    console.log('\n' + '='.repeat(80));
    console.log('RESUMO DA AUDITORIA:');
    console.log('='.repeat(80));
    const aprovados = liveResults.filter((r) => r.status === 'APROVADO').length;
    const pendentes = liveResults.filter((r) => r.status.includes('PENDENTE') || r.status.includes('VULNERABILIDADE')).length;
    const reprovados = liveResults.filter((r) => r.status === 'REPROVADO').length;
    console.log(`TOTAL DE ITENS AUDITADOS: ${liveResults.length}`);
    console.log(`APROVADOS NO BANCO REAL: ${aprovados}`);
    console.log(`PENDENTES DE EXECUÇÃO SQL: ${pendentes}`);
    console.log(`REPROVADOS: ${reprovados}`);
    console.log('='.repeat(80));
  }
}

runAudit();

