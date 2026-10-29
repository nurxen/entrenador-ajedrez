// Genera src/openings.json a partir del repositorio CC0 lichess-org/chess-openings
import fs from 'node:fs';
import { Chess } from 'chess.js';
const out = {};
for (const f of ['a','b','c','d','e']) {
  const lines = fs.readFileSync(`data/${f}.tsv`, 'utf8').trim().split('\n').slice(1);
  for (const l of lines) {
    const [eco, name, pgn] = l.split('\t');
    const c = new Chess();
    try { c.loadPgn(pgn); } catch { continue; }
    const key = c.fen().split(' ').slice(0, 3).join(' ');
    if (!out[key] || out[key][1].length > name.length) out[key] = [eco, name];
  }
}
fs.writeFileSync('src/openings.json', JSON.stringify(out));
console.log(Object.keys(out).length, 'posiciones');
