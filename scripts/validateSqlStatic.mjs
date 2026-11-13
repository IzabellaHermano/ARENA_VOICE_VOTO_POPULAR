import fs from 'fs';

const sql = fs.readFileSync('supabase/etapa2_access_control.sql', 'utf8');

console.log('=== VALIDAÇÃO ESTÁTICA DO ARQUIVO SQL ===');
console.log('Tamanho em bytes:', sql.length);
console.log('Total de linhas:', sql.split('\n').length);

// 1. Checagem de BEGIN e COMMIT
const hasBegin = /^\s*BEGIN\s*;/m.test(sql);
const hasCommit = /^\s*COMMIT\s*;/m.test(sql);
console.log('Possui BEGIN;', hasBegin);
console.log('Possui COMMIT;', hasCommit);

// 2. Checagem de blocos DO $$ e $$;
const doBlocks = (sql.match(/DO\s*\$\$/g) || []).length;
const endBlocks = (sql.match(/\$\$;/g) || []).length;
console.log('Blocos DO $$ encontrados:', doBlocks);
console.log('Terminações $$; encontradas:', endBlocks);

// 3. Checagem de funções CREATE OR REPLACE FUNCTION
const functions = [...sql.matchAll(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.([a-zA-Z0-9_]+)\s*\(/g)].map(m => m[1]);
console.log('Funções declaradas (' + functions.length + '):', functions);

// 4. Checagem de REVOKE e GRANT
const revokes = [...sql.matchAll(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.([a-zA-Z0-9_]+)/g)].map(m => m[1]);
console.log('Funções com REVOKE (' + revokes.length + '):', [...new Set(revokes)]);

const grants = [...sql.matchAll(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.([a-zA-Z0-9_]+)/g)].map(m => m[1]);
console.log('Funções com GRANT (' + grants.length + '):', [...new Set(grants)]);

// 5. Checagem de NOTIFY pgrst
const hasNotify = /NOTIFY\s+pgrst\s*,\s*'reload schema'\s*;/i.test(sql);
console.log('Possui NOTIFY pgrst, \'reload schema\';:', hasNotify);

// 6. Checagem da posição do NOTIFY em relação ao COMMIT
const notifyIdx = sql.indexOf("NOTIFY pgrst, 'reload schema';");
const commitIdx = sql.indexOf("COMMIT;");
console.log('NOTIFY antes do COMMIT?', notifyIdx !== -1 && commitIdx !== -1 && notifyIdx < commitIdx);

// 7. Checagem de normalização do search_path
const searchPathChecks = [...sql.matchAll(/replace\s*\(\s*cfg\s*,\s*' '\s*,\s*''\s*\)\s*=\s*'search_path=public,pg_temp'/g)].length;
console.log('Checagens normalizadas de search_path encontradas:', searchPathChecks);

