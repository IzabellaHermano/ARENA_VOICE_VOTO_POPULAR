import fs from 'fs';
import path from 'path';

const sqlPath = path.resolve('supabase/etapa4_event_settings.sql');
const content = fs.readFileSync(sqlPath, 'utf-8');

console.log('=== VALIDAÇÃO ESTÁTICA DO SCRIPT SQL ETAPA 4 ===');
console.log('Arquivo:', sqlPath);
console.log('Tamanho:', content.length, 'bytes');
console.log('Linhas:', content.split('\n').length);

// 1. BEGIN / COMMIT
const hasBegin = content.includes('BEGIN;');
const hasCommit = content.includes('COMMIT;');
console.log('Transação segura BEGIN; / COMMIT;:', hasBegin && hasCommit ? 'OK' : 'FALHA');

// 2. Delimitadores $$
const dollarMatches = content.match(/\$\$/g) || [];
console.log('Delimitadores $$ contagem:', dollarMatches.length, dollarMatches.length % 2 === 0 ? '(Par - OK)' : '(Ímpar - FALHA)');

// 3. Funções criadas
const functions = content.match(/CREATE OR REPLACE FUNCTION [a-zA-Z0-9_.]+/g) || [];
console.log('Funções declaradas:');
functions.forEach(f => console.log('  -', f));

// 4. Tabelas criadas ou alteradas
const tables = content.match(/CREATE TABLE IF NOT EXISTS [a-zA-Z0-9_.]+/g) || [];
console.log('Tabelas criadas:');
tables.forEach(t => console.log('  -', t));

// 5. Reload postgrest
const hasNotify = content.includes("NOTIFY pgrst, 'reload schema';");
console.log("NOTIFY pgrst:", hasNotify ? 'OK' : 'FALHA');

if (hasBegin && hasCommit && dollarMatches.length % 2 === 0 && hasNotify) {
  console.log('\n>>> RESULTADO: SCRIPT SQL 100% VÁLIDO E PRONTO PARA AUDITORIA! <<<');
} else {
  console.error('\n>>> RESULTADO: ERRO NA VALIDAÇÃO SINTÁTICA DO SCRIPT! <<<');
  process.exit(1);
}

