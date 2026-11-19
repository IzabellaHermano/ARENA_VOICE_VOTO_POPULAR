import fs from 'fs';
import path from 'path';

function searchAll(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchAll(full);
    } else {
      try {
        const c = fs.readFileSync(full, 'utf-8');
        if (c.includes('teste-evento-mwf3or7h')) {
          console.log('FILE:', full);
          c.split('\n').forEach((line, idx) => {
            if (line.includes('teste-evento-mwf3or7h')) {
              console.log(`  L${idx+1}: ${line.trim()}`);
            }
          });
        }
      } catch {}
    }
  }
}

searchAll('.');

