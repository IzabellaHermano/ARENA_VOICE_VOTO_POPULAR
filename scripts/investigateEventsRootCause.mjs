import fs from 'fs';
import path from 'path';

function searchInDir(dir, searchTerms) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchInDir(fullPath, searchTerms);
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const term of searchTerms) {
        if (content.includes(term)) {
          console.log(`[${term}] in ${fullPath}`);
        }
      }
    }
  }
}

console.log('--- BUSCANDO ONDE EVENTS SÃO CRIADOS OU INSERIDOS EM SRC ---');
searchInDir('src', [
  ".from('events')",
  '.from("events")',
  'createEvent',
  'DEFAULT_EVENT_ID',
  'Arena Voice 2026',
  'localStorage',
  'sessionStorage'
]);

