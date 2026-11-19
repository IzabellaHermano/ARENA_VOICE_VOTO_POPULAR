import fs from 'fs';
import path from 'path';

function searchTerms(dir, terms) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchTerms(fullPath, terms);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      terms.forEach(t => {
        if (content.includes(t)) {
          console.log(`[${t}] ${fullPath}`);
          content.split('\n').forEach((l, idx) => {
            if (l.includes(t)) {
              console.log(`  L${idx+1}: ${l.trim().slice(0, 110)}`);
            }
          });
        }
      });
    }
  }
}

searchTerms('src', ['DEFAULT_EVENT_ID']);

