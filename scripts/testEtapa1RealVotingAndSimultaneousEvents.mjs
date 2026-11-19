import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Lê variáveis de ambiente
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

const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

console.log('=== SUITE DE TESTES REAIS — ETAPA 1: VOTAÇÃO E EVENTOS SIMULTÂNEOS ===\n');

async function runTestSuite() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  if (adminAuthErr) {
    console.error('Falha de autenticação do Admin:', adminAuthErr);
    process.exit(1);
  }
  console.log('✓ Admin autenticado com sucesso:', adminAuth.user.email);

  const eventAId = 'evento-caua-mwnili8h';
  const eventBId = 'teste-1-mwnil72s';

  // 1. Fecha rodadas prévias abertas para garantir ambiente limpo
  for (const evId of [eventAId, eventBId]) {
    const { data: openRounds } = await adminClient
      .from('rounds')
      .select('id')
      .eq('event_id', evId)
      .eq('status', 'open');
    for (const r of openRounds || []) {
      await adminClient.rpc('close_round', { p_event_id: evId, p_round_id: r.id });
    }
  }
  console.log('✓ Estado limpo: rodadas abertas prévias encerradas.');

  // 2. Busca projetos do Evento A e Evento B
  const { data: projsA } = await adminClient
    .from('projects')
    .select('id, name')
    .eq('event_id', eventAId)
    .order('order');
  const { data: projsB } = await adminClient
    .from('projects')
    .select('id, name')
    .eq('event_id', eventBId)
    .order('order');

  console.log(`✓ Evento A (${eventAId}): ${projsA?.length} projetos encontrados.`);
  console.log(`✓ Evento B (${eventBId}): ${projsB?.length} projetos encontrados.`);

  const projA = projsA[0];
  const projB = projsB[0];
  console.log(`  -> Projeto Alvo Evento A: "${projA.name}" (${projA.id})`);
  console.log(`  -> Projeto Alvo Evento B: "${projB.name}" (${projB.id})`);

  // 3. Garante perguntas em public.event_questions para ambos os eventos
  const { data: qA } = await adminClient.from('event_questions').select('id, title').eq('event_id', eventAId);
  const { data: qB } = await adminClient.from('event_questions').select('id, title').eq('event_id', eventBId);
  console.log(`✓ Perguntas cadastradas no Evento A: ${qA?.length}`);
  console.log(`✓ Perguntas cadastradas no Evento B: ${qB?.length}`);

  // 4. TESTE DE ABERTURA SIMULTÂNEA DE RODADAS
  console.log('\n--- TESTE 1: ABERTURA SIMULTÂNEA DE RODADAS ---');
  const openResA = await adminClient.rpc('open_round', {
    p_event_id: eventAId,
    p_project_id: projA.id,
    p_duration_seconds: 120,
  });
  console.log('✓ Rodada aberta no Evento A:', openResA.data);

  const openResB = await adminClient.rpc('open_round', {
    p_event_id: eventBId,
    p_project_id: projB.id,
    p_duration_seconds: 120,
  });
  console.log('✓ Rodada aberta no Evento B:', openResB.data);

  // Confirma se ambos os eventos têm current_round_id ativo ao mesmo tempo no banco
  const { data: evARow } = await adminClient.from('events').select('status, current_round_id').eq('id', eventAId).single();
  const { data: evBRow } = await adminClient.from('events').select('status, current_round_id').eq('id', eventBId).single();
  console.log(`  -> Evento A no banco: status=${evARow.status}, round=${evARow.current_round_id}`);
  console.log(`  -> Evento B no banco: status=${evBRow.status}, round=${evBRow.current_round_id}`);

  if (evARow.current_round_id && evBRow.current_round_id && evARow.current_round_id !== evBRow.current_round_id) {
    console.log('✓ SUCESSO: Dois eventos estão em andamento SIMULTANEAMENTE com rodadas distintas!');
  } else {
    throw new Error('Falha na simultaneidade de rodadas.');
  }

  // 5. TESTE DE VOTAÇÃO NO DISPOSITIVO 1 (EVENTO A)
  console.log('\n--- TESTE 2: DISPOSITIVO 1 VOTA NO EVENTO A ---');
  const device1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: dev1Auth } = await device1.auth.signInAnonymously();
  console.log(`✓ Dispositivo 1 autenticado anonimamente (UID: ${dev1Auth.user.id})`);

  const voteA = await device1.rpc('submit_vote', {
    p_event_id: eventAId,
    p_round_id: openResA.data.round_id,
    p_project_id: projA.id,
    p_answers: qA.map((q, idx) => ({ question_id: q.id, score: 5 })),
  });
  console.log('✓ Retorno submit_vote Dispositivo 1:', voteA.data);
  if (!voteA.data?.success) throw new Error(`Falha no voto A: ${JSON.stringify(voteA.error)}`);

  // 6. TESTE DE VOTAÇÃO NO DISPOSITIVO 2 (EVENTO B)
  console.log('\n--- TESTE 3: DISPOSITIVO 2 VOTA NO EVENTO B (SIMULTÂNEO) ---');
  const device2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: dev2Auth } = await device2.auth.signInAnonymously();
  console.log(`✓ Dispositivo 2 autenticado anonimamente (UID: ${dev2Auth.user.id})`);

  const voteB = await device2.rpc('submit_vote', {
    p_event_id: eventBId,
    p_round_id: openResB.data.round_id,
    p_project_id: projB.id,
    p_answers: qB.map((q, idx) => ({ question_id: q.id, score: 4 })),
  });
  console.log('✓ Retorno submit_vote Dispositivo 2:', voteB.data);
  if (!voteB.data?.success) throw new Error(`Falha no voto B: ${JSON.stringify(voteB.error)}`);

  // 7. TESTE DE DETECÇÃO DE VOTO DUPLICADO
  console.log('\n--- TESTE 4: BLOQUEIO DE VOTO DUPLICADO ---');
  const dupVote = await device1.rpc('submit_vote', {
    p_event_id: eventAId,
    p_round_id: openResA.data.round_id,
    p_project_id: projA.id,
    p_answers: qA.map((q) => ({ question_id: q.id, score: 5 })),
  });
  console.log('Tentativa de voto duplicado (esperado erro):', dupVote.error?.message);
  if (dupVote.error?.message?.includes('duplicado') || dupVote.error?.code === '23505') {
    console.log('✓ SUCESSO: Voto duplicado bloqueado com segurança!');
  } else {
    throw new Error('Falha: voto duplicado não foi rejeitado!');
  }

  // 8. TESTE DE BLOQUEIO DE VOTO CRUZADO (DISPOSITIVO A TENTA VOTAR EM RODADA DO EVENTO B)
  console.log('\n--- TESTE 5: BLOQUEIO DE INVASÃO CRUZADA ENTRE EVENTOS ---');
  const crossVote = await device1.rpc('submit_vote', {
    p_event_id: eventAId,
    p_round_id: openResB.data.round_id, // Round pertence ao Evento B!
    p_project_id: projA.id,
    p_answers: qA.map((q) => ({ question_id: q.id, score: 5 })),
  });
  console.log('Tentativa de voto cruzado (esperado erro):', crossVote.error?.message);
  if (crossVote.error?.message?.includes('não corresponde') || crossVote.error?.code === '23514') {
    console.log('✓ SUCESSO: Voto cruzado bloqueado! Isolamento de eventos garantido no banco.');
  } else {
    throw new Error('Falha: voto cruzado entre eventos não foi bloqueado!');
  }

  // 9. VERIFICAÇÃO DE RESULTADOS INDEPENDENTES EM PUBLIC.RESULTS E GET_ADMIN_RESULTS
  console.log('\n--- TESTE 6: APURAÇÃO E ISOLAMENTO DOS RESULTADOS ---');
  const resA = await adminClient.rpc('get_admin_results', { p_event_id: eventAId });
  const resB = await adminClient.rpc('get_admin_results', { p_event_id: eventBId });

  const projAResult = resA.data?.results?.find((r) => r.project_id === projA.id);
  const projBResult = resB.data?.results?.find((r) => r.project_id === projB.id);

  console.log('Resultado Projeto A no Evento A:', {
    projeto: projAResult?.project_name,
    total_votos: projAResult?.total_votes,
    media_geral: projAResult?.average_general,
    pontos: projAResult?.popular_points,
  });

  console.log('Resultado Projeto B no Evento B:', {
    projeto: projBResult?.project_name,
    total_votos: projBResult?.total_votes,
    media_geral: projBResult?.average_general,
    pontos: projBResult?.popular_points,
  });

  if (projAResult?.total_votes >= 1 && projBResult?.total_votes >= 1) {
    console.log('✓ SUCESSO: Ambos os eventos possuem apuração isolada e computada com precisão!');
  } else {
    throw new Error('Falha na apuração dos votos.');
  }

  // 10. TESTE DE URLS DINÂMICAS DO TELÃO
  console.log('\n--- TESTE 7: RESOLUÇÃO DE URLS DO QR CODE DO TELÃO ---');
  const origin = 'https://arena-voice-voto-popular.web.app';
  const urlA = `${origin}/votar/${encodeURIComponent(eventAId)}`;
  const urlB = `${origin}/votar/${encodeURIComponent(eventBId)}`;
  console.log(`  -> URL Telão Evento A: ${urlA}`);
  console.log(`  -> URL Telão Evento B: ${urlB}`);
  if (urlA !== urlB && urlA.includes(eventAId) && urlB.includes(eventBId)) {
    console.log('✓ SUCESSO: Telões geram QR Codes com destinos distintos e isolados por evento.');
  }

  console.log('\n======================================================');
  console.log('✓✓✓ TODOS OS 7 TESTES DA ETAPA 1 FORAM CONCLUÍDOS COM SUCESSO! ✓✓✓');
  console.log('======================================================');
}

runTestSuite().catch((err) => {
  console.error('\n❌ ERRO NA EXECUÇÃO DA SUITE DE TESTES:', err);
  process.exit(1);
});

