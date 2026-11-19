import fs from 'fs';
import path from 'path';

function searchInSrc(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchInSrc(fullPath);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('insert(') || content.includes('upsert(') || content.includes('seed') || content.includes('Seed') || content.includes('mwf3or7h')) {
        console.log(`Match in: ${fullPath}`);
        // print matching lines
        content.split('\n').forEach((l, idx) => {
          if (l.includes('insert(') || l.includes('upsert(') || l.includes('mwf3or7h') || l.toLowerCase().includes('seed')) {
            console.log(`  L${idx+1}: ${l.trim().slice(0, 120)}`);
          }
        });
      }
    }
  }
}

searchInSrc('src');

