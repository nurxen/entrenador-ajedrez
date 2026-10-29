// Uso: node scripts/analyze-cli.mjs partida.pgn [usuario] [profundidad]
import fs from 'node:fs';
import { createNodeEngine } from './node-engine.mjs';
import { analyzeGame, countClasses, CLASSES } from '../src/analysis/analyzer.js';
const [file, user = '', depth = '14'] = process.argv.slice(2);
const engine = createNodeEngine();
const t0 = Date.now();
const a = await analyzeGame(fs.readFileSync(file, 'utf8'), engine, { depth: +depth });
const me = a.headers.White?.toLowerCase() === user.toLowerCase() ? 'w' : 'b';
console.log(`${a.headers.White} - ${a.headers.Black} ${a.result} | ${a.opening?.name} | precisión B ${a.accuracy.w} N ${a.accuracy.b} | ${((Date.now()-t0)/1000).toFixed(0)}s`);
console.log(JSON.stringify(countClasses(a.moves, me)));
for (const m of a.moves) {
  const n = Math.floor(m.ply / 2) + 1 + (m.color === 'w' ? '.' : '...');
  const mark = m.color === me ? '*' : ' ';
  if (!['best','excellent','good','book'].includes(m.cls) || m.color===me && m.cls!=='book')
    console.log(`${mark}${n}${m.san}\t${CLASSES[m.cls].label}\t-${m.loss}\t${(m.evalAfter/100).toFixed(1)}\t${m.tags.join(',')}\t${m.note||''}`);
}
fs.writeFileSync(file.replace('.pgn', '.analysis.json'), JSON.stringify(a));
process.exit(0);
