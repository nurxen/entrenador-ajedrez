// Stockfish 19 (versión ligera, un hilo) ejecutándose en un Web Worker del propio móvil.
import { parseInfo } from './analysis/uci.js';

export function createBrowserEngine() {
  const worker = new Worker(`${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`);
  let pending = null, lines = {}, ready;
  const readyP = new Promise((r) => (ready = r));
  worker.onmessage = (e) => {
    const line = typeof e.data === 'string' ? e.data : '';
    if (line === 'uciok' || line === 'readyok') ready();
    if (!pending) return;
    if (line.startsWith('info') && line.includes(' pv ')) {
      const p = parseInfo(line);
      if (p) lines[p.multipv] = p;
    } else if (line.startsWith('bestmove')) {
      const r = pending; pending = null;
      r({ lines: Object.keys(lines).sort().map((k) => lines[k]) });
    }
  };
  worker.postMessage('uci');
  worker.postMessage('setoption name Hash value 32');
  let queue = Promise.resolve();
  return {
    evaluate(fen, { depth = 14, multipv = 2, movetime = 4000 } = {}) {
      const job = queue.then(() => readyP).then(() => new Promise((res) => {
        lines = {}; pending = res;
        worker.postMessage(`setoption name MultiPV value ${multipv}`);
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go depth ${depth} movetime ${movetime}`);
      }));
      queue = job.catch(() => {});
      return job;
    },
    terminate() { worker.terminate(); },
  };
}
