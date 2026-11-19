import fs from 'fs';

const c = fs.readFileSync('src/services/eventService.ts', 'utf-8');
const lines = c.split('\n');
console.log('--- BUSCANDO INSERTS EM EVENTSERVICE.TS ---');
lines.forEach((l, i) => {
  if (l.includes("name: 'Arena Voice 2026'") || (l.includes('.insert(') && l.includes('events'))) {
    console.log((i + 1) + ': ' + l.trim());
  }
});
console.log('--- FIM DA BUSCA ---');

