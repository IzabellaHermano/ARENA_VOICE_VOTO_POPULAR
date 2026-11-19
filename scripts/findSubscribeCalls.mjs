import fs from 'fs';
import path from 'path';

function searchCalls(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchCalls(fullPath);
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('subscribeToCurrentEvent')) {
        console.log(`subscribeToCurrentEvent called in: ${fullPath}`);
        content.split('\n').forEach((l, idx) => {
          if (l.includes('subscribeToCurrentEvent')) {
            console.log(`  L${idx+1}: ${l.trim()}`);
          }
        });
      }
    }
  }
}

searchCalls('src');

