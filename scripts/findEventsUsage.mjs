import fs from 'fs';
import path from 'path';

function search(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      search(full);
    } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.mjs')) {
      const content = fs.readFileSync(full, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((l, i) => {
        if (l.includes("events") && (l.includes("insert") || l.includes("upsert"))) {
          console.log(`${full}:${i+1}: ${l.trim()}`);
        }
      });
    }
  }
}
search('src');
search('scripts');

