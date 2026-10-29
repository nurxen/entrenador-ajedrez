// Adaptador de Stockfish para Node (pruebas y análisis por lotes desde terminal)
import { createRequire } from 'node:module';
import { parseInfo } from '../src/analysis/uci.js';
const require = createRequire(import.meta.url);

export function createNodeEngine() {
  const sf = require('stockfish')('lite-single');
  let pending = null;
  let lines = {};
  sf.listener = (line) => {
    if (!pending) return;
    if (line.startsWith('info') && line.includes(' pv ')) {
      const p = parseInfo(line);
      if (p) lines[p.multipv] = p;
    } else if (line.startsWith('bestmove')) {
      const r = pending; pending = null;
      r({ lines: Object.keys(lines).sort().map((k) => lines[k]) });
    }
  };
  sf.processCommand('uci');
  sf.processCommand('setoption name Hash value 64');
  return {
    evaluate(fen, { depth = 12, multipv = 2 } = {}) {
      return new Promise((res) => {
        lines = {}; pending = res;
        sf.processCommand(`setoption name MultiPV value ${multipv}`);
        sf.processCommand(`position fen ${fen}`);
        sf.processCommand(`go depth ${depth}`);
      });
    },
    terminate() { sf.terminate?.(); },
  };
}
