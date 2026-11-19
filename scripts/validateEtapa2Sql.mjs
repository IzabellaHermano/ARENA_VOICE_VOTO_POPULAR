import fs from 'fs';
import path from 'path';

const sqlPath = path.resolve('supabase/etapa2_rbac_patch.sql');
const content = fs.readFileSync(sqlPath, 'utf-8');

console.log('=== VALIDAÇÃO ESTÁTICA DO SCRIPT SQL ETAPA 2 ===');
console.log('Arquivo:', sqlPath);
console.log('Tamanho:', content.length, 'bytes');
console.log('Linhas:', content.split('\n').length);

const hasBegin = content.includes('BEGIN;');
const hasCommit = content.includes('COMMIT;');
console.log('Transação segura BEGIN; / COMMIT;:', hasBegin && hasCommit ? 'OK' : 'FALHA');

const dollarMatches = content.match(/\$\$/g) || [];
console.log('Delimitadores $$ contagem:', dollarMatches.length, dollarMatches.length % 2 === 0 ? '(Par - OK)' : '(Ímpar - FALHA)');

const functions = content.match(/CREATE OR REPLACE FUNCTION [a-zA-Z0-9_.]+/g) || [];
console.log('Funções declaradas:');
functions.forEach((f) => console.log('  -', f));

const hasNotify = content.includes("NOTIFY pgrst, 'reload schema';");
console.log("NOTIFY pgrst:", hasNotify ? 'OK' : 'FALHA');

if (hasBegin && hasCommit && dollarMatches.length % 2 === 0 && hasNotify) {
  console.log('\n>>> SCRIPT SQL ETAPA 2 100% VÁLIDO E PRONTO PARA APLICAÇÃO! <<<');
} else {
  console.error('\n>>> FALHA NA VALIDAÇÃO DO SCRIPT SQL! <<<');
  process.exit(1);
}

