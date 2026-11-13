import { createClient } from '@supabase/supabase-js';
import assert from 'assert';

const SUPABASE_URL = 'https://dtbwnngmmtmcipvkdjlm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o1_dF35nX35IChKm6D2TQw_hz9w-RG4';

// Simula a lógica de mapResultRow e scoring exatamente como no frontend
function mapResultRow(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    projectId: row.project_id,
    totalVotes: Number(row.total_votes || 0),
    sumInnovation: Number(row.sum_innovation || 0),
    sumImpact: Number(row.sum_impact || 0),
    sumDevelopment: Number(row.sum_development || 0),
    averageInnovation: row.average_innovation !== null ? Number(row.average_innovation) : null,
    averageImpact: row.average_impact !== null ? Number(row.average_impact) : null,
    averageDevelopment: row.average_development !== null ? Number(row.average_development) : null,
    averageGeneral: row.average_general !== null ? Number(row.average_general) : null,
    percentage: row.percentage !== null ? Number(row.percentage) : null,
    popularPoints: row.popular_points !== null ? Number(row.popular_points) : null,
    popularVoteWeight: row.popular_vote_weight !== undefined && row.popular_vote_weight !== null ? Number(row.popular_vote_weight) : 20.0,
    questionsMetrics: row.questions_metrics,
    updatedAt: { seconds: Math.floor(new Date(row.updated_at || Date.now()).getTime() / 1000), nanoseconds: 0 },
  };
}

async function testEndToEndResults() {
  console.log('=== TESTE DE PONTA A PONTA: RESOLUÇÃO DOS RESULTADOS E RANKING ===\n');
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await adminClient.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.CPTM_ADMIN_PASSWORD || '123456',
  });

  const eventId = 'teste-evento-mwf3or7h';

  // 1. Busca configurações (peso = 40%)
  const { data: settings } = await adminClient
    .from('event_settings')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle();

  const weight = settings?.popular_vote_weight ?? 20;
  console.log(`✓ Configurações carregadas: Peso Popular = ${weight}%`);
  assert(weight === 40, 'Peso do evento teste deve ser 40%');

  // 2. Busca projetos
  const { data: projects } = await adminClient
    .from('projects')
    .select('*')
    .eq('event_id', eventId)
    .order('order', { ascending: true });

  console.log(`✓ Total de projetos encontrados: ${projects?.length}`);
  assert(projects && projects.length === 4, 'Devem existir 4 projetos no evento teste');

  // 3. Executa a nova consulta com safeColumns
  const safeColumns = 'id, event_id, project_id, total_votes, sum_innovation, sum_impact, sum_development, average_innovation, average_impact, average_development, average_general, percentage, popular_points, updated_at';
  const { data: resultsData, error: resultsError } = await adminClient
    .from('results')
    .select(safeColumns)
    .eq('event_id', eventId);

  assert(!resultsError, `Erro na consulta com safeColumns: ${resultsError?.message}`);
  assert(resultsData && resultsData.length === 4, 'Devem retornar 4 resultados consolidados');
  console.log(`✓ Consulta com safeColumns bem-sucedida! ${resultsData.length} resultados retornados.`);

  // 4. Mapeia resultados
  const mappedResults = resultsData.map(mapResultRow);
  const resultsMap = new Map();
  mappedResults.forEach(r => resultsMap.set(r.projectId, r));

  // 5. Calcula ranking
  const ranked = projects.map(p => {
    const res = resultsMap.get(p.id);
    const totalVotes = res?.totalVotes || 0;
    const avgGen = res?.averageGeneral || 0;
    const percent = res?.percentage || 0;
    const points = res?.popularPoints || 0;
    return {
      projectId: p.id,
      name: p.name,
      order: p.order,
      totalVotes,
      hasEvaluations: totalVotes > 0,
      averageGeneral: avgGen,
      percentage: percent,
      popularPoints: points,
    };
  }).sort((a, b) => b.popularPoints - a.popularPoints);

  const totalVotesCount = ranked.reduce((acc, p) => acc + p.totalVotes, 0);

  console.log(`\n--- RESULTADOS APURADOS PELO DASHBOARD ---`);
  console.log(`Total de Projetos: ${projects.length}`);
  console.log(`Votos Computados: ${totalVotesCount}`);
  console.log(`Líder Atual: ${ranked[0].name} com ${ranked[0].popularPoints} pontos (${ranked[0].percentage}%)\n`);

  ranked.forEach((p, idx) => {
    console.log(`[${idx + 1}º Lugar] ${p.name}: ${p.totalVotes} voto | Média: ${p.averageGeneral} | ${p.percentage}% | ${p.popularPoints} pts | Avaliado: ${p.hasEvaluations}`);
  });

  assert(totalVotesCount === 4, `Total de votos deve ser 4, obtido: ${totalVotesCount}`);
  assert(ranked[0].name === 'teste proj 3', `Líder deve ser teste proj 3, obtido: ${ranked[0].name}`);
  assert(ranked.every(p => p.hasEvaluations === true), 'Todos os projetos devem ter hasEvaluations=true');

  console.log('\n✅ TODOS OS TESTES PASSARAM COM SUCESSO! O DASHBOARD AGORA APURA E EXIBE CORRETAMENTE.');
}

testEndToEndResults().catch(console.error);

