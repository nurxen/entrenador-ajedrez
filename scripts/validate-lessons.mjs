// Comprueba todas las lecciones: jugadas legales y soluciones confirmadas por Stockfish.
// Uso: npm run lecciones
import { Chess } from 'chess.js';
import { CHAPTERS } from '../src/learn/lessons.js';
import { createNodeEngine } from './node-engine.mjs';
import { winPct, lineCp } from '../src/analysis/analyzer.js';

const engine = createNodeEngine();
const sanList = (line) => line.replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/).filter(Boolean);
let errors = 0, checked = 0;
const fail = (id, msg) => { errors++; console.log(`✗ ${id}: ${msg}`); };

for (const ch of CHAPTERS) for (const l of ch.lessons) {
  if (l.type === 'bio') continue;
  if (l.type === 'game') {
    const c = new Chess();
    const labels = [];
    for (const san of sanList(l.pgn)) {
      const n = Math.floor(c.history().length / 2) + 1, w = c.turn() === 'w';
      try { const m = c.move(san); labels.push(`${n}${w ? '.' : '...'}${m.san}`); } catch { fail(l.id, `jugada ilegal ${san}`); break; }
    }
    for (const k of Object.keys(l.notes || {})) if (!labels.includes(k)) fail(l.id, `nota sin jugada: ${k}`);
    checked++;
    continue;
  }
  let fen = new Chess().fen();
  for (const [i, st] of l.steps.entries()) {
    const id = `${l.id}#${i + 1}`;
    if (st.fen) fen = st.fen;
    else if (st.line !== undefined) { const c = new Chess(); try { for (const s of sanList(st.line)) c.move(s); } catch (e) { fail(id, `línea ilegal: ${e.message}`); continue; } fen = c.fen(); }
    try { new Chess(fen); } catch (e) { fail(id, `FEN inválido ${e.message}`); continue; }
    if (st.puzzle) {
      const c = new Chess(fen);
      const me = c.turn();
      for (const san of st.puzzle.solution.split(' ')) {
        if (c.turn() === me) {
          const r = await engine.evaluate(c.fen(), { depth: 18, multipv: 1 });
          let m; try { m = new Chess(c.fen()).move(san); } catch { fail(id, `solución ilegal ${san}`); break; }
          const after = new Chess(c.fen()); after.move(san);
          let wMine;
          if (after.isCheckmate()) wMine = 100;
          else { const r2 = await engine.evaluate(after.fen(), { depth: 16, multipv: 1 }); wMine = 100 - winPct(lineCp(r2.lines[0])); }
          const wBest = winPct(lineCp(r.lines[0]));
          if (wBest - wMine > 2) fail(id, `${san} no es la mejor (motor: ${r.lines[0].uci}, pierde ${(wBest - wMine).toFixed(1)}%)`);
        }
        try { c.move(san); } catch { fail(id, `solución ilegal ${san}`); break; }
      }
      fen = c.fen();
      checked++;
    }
    if (st.moves) { const c = new Chess(fen); try { for (const s of st.moves) c.move(s); } catch (e) { fail(id, `jugadas ilegales: ${e.message}`); } fen = c.fen(); }
  }
  for (const d of l.drills || []) { const c = new Chess(); try { for (const s of sanList(d.line)) c.move(s); } catch (e) { fail(`${l.id} práctica ${d.name}`, e.message); } }
}
console.log(errors ? `\n${errors} problema(s)` : `\nTodo correcto (${checked} ejercicios y partidas comprobados)`);
process.exit(errors ? 1 : 0);
