import fs from 'fs';

const sql = fs.readFileSync('supabase/etapa3_custom_questions.sql', 'utf8');

console.log('=== VALIDAÇÃO ESTÁTICA ETAPA 3 ===');
console.log('Tamanho:', sql.length, 'bytes');
console.log('Linhas:', sql.split('\n').length);

const hasBegin = /^\s*BEGIN\s*;/m.test(sql);
const hasCommit = /^\s*COMMIT\s*;/m.test(sql);
console.log('BEGIN:', hasBegin, '| COMMIT:', hasCommit);

const doBlocks = (sql.match(/DO\s*\$\$/g) || []).length;
const endBlocks = (sql.match(/\$\$;/g) || []).length;
console.log('Blocos DO:', doBlocks, '| Terminações $$;:', endBlocks);

const functions = [...sql.matchAll(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.([a-zA-Z0-9_]+)\s*\(/g)].map(m => m[1]);
console.log('Funções declaradas (' + functions.length + '):', functions);
console.log('Total de blocos (DO + funções):', doBlocks + functions.length, '| Terminações $$;:', endBlocks);

const hasNotify = /NOTIFY\s+pgrst\s*,\s*'reload schema'\s*;/i.test(sql);
console.log('NOTIFY pgrst:', hasNotify);

