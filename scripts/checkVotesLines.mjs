import fs from 'fs';

const content = fs.readFileSync('./src/services/eventService.ts', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes("'votes'") || line.includes('"votes"')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});

