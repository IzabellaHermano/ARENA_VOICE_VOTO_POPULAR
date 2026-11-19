import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read .env
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let v = match[2] || '';
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[match[1]] = v.trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

function walk(dir) {
  let res = [];
  fs.readdirSync(dir).forEach((f) => {
    f = path.join(dir, f);
    if (fs.statSync(f).isDirectory()) res = res.concat(walk(f));
    else if (f.endsWith('.ts') || f.endsWith('.tsx')) res.push(f);
  });
  return res;
}

const allSrc = walk('src');

console.log('=== BUSCA POR DELEÇÃO DE EVENTO NO FRONTEND ===');
allSrc.forEach((f) => {
  const c = fs.readFileSync(f, 'utf8');
  if (c.includes('deleteEvent') || c.includes('excluir') || c.includes('handleDelete') || c.includes('.delete()')) {
    const lines = c.split('\n');
    lines.forEach((l, idx) => {
      if ((l.includes('event') || l.includes('Event')) && (l.includes('delete') || l.includes('Delete') || l.includes('excluir'))) {
        console.log(`${f}:${idx + 1} -> ${l.trim()}`);
      }
    });
  }
});

