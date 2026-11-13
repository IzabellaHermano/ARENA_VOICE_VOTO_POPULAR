import fs from 'fs';
import path from 'path';

function searchInDir(dir, pattern) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') searchInDir(full, pattern);
    } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf-8');
      if (content.includes(pattern)) {
        console.log('Found in:', full);
      }
    }
  }
}

console.log("--- Arquivos que consultam 'votes' ---");
searchInDir('./src', "'votes'");

