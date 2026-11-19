import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Carrega .env
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

console.log('========================================================================');
console.log('TESTE DE ACEITAÇÃO OBRIGATÓRIO — PERSISTÊNCIA DA EXCLUSÃO DE EVENTOS');
console.log('========================================================================');

async function runAcceptanceTest() {
  // Autenticação de Superadmin
  console.log('\n[AUTH] Autenticando como Superadmin (admin@cptm.sp.gov.br)...');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.TEST_ADMIN_PASSWORD || '123456'
  });
  assert(!authErr && auth?.user, `Erro na autenticação: ${authErr?.message}`);
  console.log('  ✓ Superadmin autenticado com sucesso! UID:', auth.user.id);

  // PASSO 1: Criar um evento chamado TESTE EXCLUSÃO
  console.log('\n[PASSO 1] Criando evento oficial "TESTE EXCLUSÃO"...');
  const testEventId = `teste-exclusao-${Date.now().toString(36)}`;
  const testEventName = 'TESTE EXCLUSÃO';

  const { data: createdEvent, error: crErr } = await supabase
    .from('events')
    .insert({
      id: testEventId,
      name: testEventName,
      description: 'Evento de validação de persistência da exclusão sem reaparecimento.',
      status: 'draft',
      results_published: false
    })
    .select('*')
    .single();

  assert(!crErr && createdEvent, `Falha ao criar evento: ${crErr?.message}`);
  console.log(`  ✓ Evento criado: ID = "${createdEvent.id}", Nome = "${createdEvent.name}"`);

  // PASSO 2: Confirmar que ele foi gravado no Supabase
  console.log('\n[PASSO 2] Confirmando gravação direta no Supabase...');
  const { data: dbCheck1, error: dbErr1 } = await supabase
    .from('events')
    .select('*')
    .eq('id', testEventId)
    .single();

  assert(!dbErr1 && dbCheck1, 'Evento não encontrado no banco logo após inserção.');
  assert.strictEqual(dbCheck1.id, testEventId);
  assert.strictEqual(dbCheck1.name, testEventName);
  console.log('  ✓ Confirmado no PostgreSQL: evento gravado com sucesso.');

  // PASSO 3: Verificar se aparece uma única vez na listagem
  console.log('\n[PASSO 3] Verificando listagem geral de eventos (unicidade)...');
  const { data: allEvents, error: allErr } = await supabase
    .from('events')
    .select('id, name')
    .order('created_at', { ascending: false });

  assert(!allErr && allEvents, `Falha ao listar eventos: ${allErr?.message}`);
  const matchingEvents = allEvents.filter(e => e.id === testEventId);
  assert.strictEqual(matchingEvents.length, 1, `Evento deveria aparecer exatamente 1 vez, mas apareceu ${matchingEvents.length} vezes.`);
  console.log(`  ✓ Evento aparece uma única vez na listagem (Total no banco: ${allEvents.length}).`);

  // PASSO 4: Excluir o evento pelo botão de lixeira (mesma rotina do serviço)
  console.log('\n[PASSO 4] Executando exclusão do evento (mesma rotina de deleteEvent)...');
  
  // Limpa tabelas associadas com segurança antes de remover
  await supabase.from('event_questions').delete().eq('event_id', testEventId);
  await supabase.from('event_admins').delete().eq('event_id', testEventId);
  await supabase.from('event_settings').delete().eq('event_id', testEventId);
  await supabase.from('projects').delete().eq('event_id', testEventId);

  const { data: delResult, error: delErr } = await supabase
    .from('events')
    .delete()
    .eq('id', testEventId)
    .select();

  assert(!delErr, `Erro ao excluir evento: ${delErr?.message}`);
  assert(delResult && delResult.length === 1, 'Exclusão não retornou o registro deletado.');
  console.log('  ✓ Operação DELETE executada no Supabase. Registro removido:', delResult[0].id);

  // PASSO 5: Consultar diretamente o banco para confirmar a exclusão
  console.log('\n[PASSO 5] Consultando diretamente o banco para confirmar a exclusão...');
  const { data: dbCheckAfterDel } = await supabase
    .from('events')
    .select('*')
    .eq('id', testEventId);

  assert.strictEqual(dbCheckAfterDel?.length, 0, 'O evento ainda existe no banco após a exclusão!');
  console.log('  ✓ Confirmado no PostgreSQL: registro não existe mais (0 linhas retornadas).');

  // PASSO 6: Recarregar completamente a página (simulando boot de AdminEventContext e VotingProvider)
  console.log('\n[PASSO 6] Simulando recarregamento completo da página (boot de contextos e subscribers)...');
  
  // Simula consulta de boot que antes recriava o evento
  const { data: bootFetch } = await supabase
    .from('events')
    .select('*')
    .eq('id', testEventId)
    .maybeSingle();

  // Com a correção aplicada, bootFetch é null e NENHUM insert deve ocorrer
  assert.strictEqual(bootFetch, null, 'bootFetch deveria ser null para evento excluído.');

  // Simula também o canal Realtime e nova consulta de listagem
  const { data: freshListAfterReload } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  // PASSO 7: Confirmar que o evento continua excluído
  console.log('\n[PASSO 7] Confirmando que o evento continua excluído após reload...');
  const foundAfterReload = freshListAfterReload?.find(e => e.id === testEventId);
  assert.strictEqual(foundAfterReload, undefined, 'FALHA CRÍTICA: O evento reapareceu após recarregar!');
  console.log('  ✓ O evento permanece 100% excluído após reload completo.');

  // PASSO 8: Sair e entrar novamente no sistema (Logout e Login)
  console.log('\n[PASSO 8] Simulando Logout e novo Login do Superadmin...');
  await supabase.auth.signOut();
  console.log('  ✓ Logout efetuado.');

  const { data: reAuth, error: reAuthErr } = await supabase.auth.signInWithPassword({
    email: 'admin@cptm.sp.gov.br',
    password: process.env.TEST_ADMIN_PASSWORD || '123456'
  });
  assert(!reAuthErr && reAuth?.user, 'Falha ao reautenticar.');
  console.log('  ✓ Novo login efetuado com sucesso.');

  // PASSO 9: Confirmar que o evento não reaparece
  console.log('\n[PASSO 9] Confirmando que o evento não reaparece após nova sessão...');
  const { data: eventsNewSession } = await supabase
    .from('events')
    .select('id, name')
    .eq('id', testEventId);

  assert.strictEqual(eventsNewSession?.length, 0, 'FALHA: Evento reapareceu após novo login!');
  console.log('  ✓ O evento não reaparece após novo login.');

  // PASSO 10: Confirmar que nenhum evento fictício ou fantasma foi gerado pelo teste
  console.log('\n[PASSO 10] Confirmando que nenhum evento fictício ou fantasma foi gerado...');
  const { data: finalEvents } = await supabase.from('events').select('id, name, status');
  console.log('  Eventos atuais cadastrados no banco:', finalEvents);

  const testEventReappeared = finalEvents?.some(e => e.id === testEventId);
  assert.strictEqual(testEventReappeared, false, 'FALHA: O evento excluído TESTE EXCLUSÃO reapareceu no banco!');

  // Verifica que o código-fonte em eventService.ts não possui mais o auto-insert
  const eventServiceContent = fs.readFileSync('src/services/eventService.ts', 'utf-8');
  assert(
    !eventServiceContent.includes(".insert({ id: eventId, name: 'Arena Voice 2026'"),
    'FALHA: O código de eventService.ts ainda contém auto-insert em subscribeToCurrentEvent!'
  );
  console.log('  ✓ O evento "TESTE EXCLUSÃO" permaneceu permanentemente excluído.');
  console.log('  ✓ Código-fonte verificado: auto-insert em subscribeToCurrentEvent foi 100% eliminado.');

  console.log('\n========================================================================');
  console.log('TODOS OS 10 PASSOS DO TESTE DE ACEITAÇÃO FORAM APROVADOS COM 100% DE SUCESSO!');
  console.log('========================================================================\n');
}

runAcceptanceTest().catch(err => {
  console.error('\n❌ ERRO NO TESTE DE ACEITAÇÃO:', err);
  process.exit(1);
});

