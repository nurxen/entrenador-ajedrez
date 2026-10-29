// Núcleo del análisis: no depende del navegador, se puede usar también en Node.
// Recibe un "engine" con el método evaluate(fen, {depth, multipv}) que devuelve
// { lines: [{ uci, cp, mate, pv: [uci...] }] } desde el punto de vista del bando que mueve.
import { Chess } from 'chess.js';
import OPENINGS from '../openings.json' with { type: 'json' };

export const CLASSES = {
  brilliant: { label: 'Brillante', sym: '!!', color: '#1bada6' },
  great: { label: 'Gran jugada', sym: '!', color: '#5c8bb0' },
  best: { label: 'Mejor', sym: '★', color: '#81b64c' },
  excellent: { label: 'Excelente', sym: '✓✓', color: '#96bc4b' },
  good: { label: 'Buena', sym: '✓', color: '#96af8b' },
  book: { label: 'Teoría', sym: '≡', color: '#a88865' },
  forced: { label: 'Forzada', sym: '→', color: '#97a1a6' },
  inaccuracy: { label: 'Imprecisión', sym: '?!', color: '#f0c15c' },
  mistake: { label: 'Error', sym: '?', color: '#e6912c' },
  miss: { label: 'Oportunidad perdida', sym: '✕', color: '#ee6b55' },
  blunder: { label: 'Error grave', sym: '??', color: '#ca3431' },
};
export const CLASS_ORDER = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'forced', 'inaccuracy', 'mistake', 'miss', 'blunder'];

export const TAGS = {
  hanging: 'Pieza o material regalado',
  missedTactic: 'Táctica no vista',
  missedMate: 'Mate no visto',
  allowedMate: 'Permitiste un mate',
  missedPunish: 'No castigaste el error rival',
  fork: 'Ataque doble',
  positional: 'Error posicional / de plan',
  endgame: 'Técnica de finales',
  opening: 'Error en la apertura',
  timeTrouble: 'Apuros de tiempo',
};

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_ES = { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' };

export function winPct(cp) {
  if (cp >= 9000) return 100;
  if (cp <= -9000) return 0;
  const c = Math.max(-1000, Math.min(1000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}
export function lineCp(line) {
  if (!line) return 0;
  if (line.mate != null) return line.mate > 0 ? 10000 - line.mate : -10000 - line.mate;
  return line.cp;
}
const fenKey = (fen) => fen.split(' ').slice(0, 3).join(' ');
export const openingOf = (fen) => OPENINGS[fenKey(fen)] || null;

function material(chess, color) {
  let s = 0;
  for (const row of chess.board()) for (const sq of row) if (sq) s += (sq.color === color ? 1 : -1) * VAL[sq.type];
  return s;
}
function nonPawnMaterial(chess) {
  let s = 0;
  for (const row of chess.board()) for (const sq of row) if (sq && sq.type !== 'p' && sq.type !== 'k') s += VAL[sq.type];
  return s;
}
function uciMove(chess, uci) {
  try {
    return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
  } catch { return null; }
}
// Material (desde el punto de vista de color) tras seguir la línea pv desde fen, como máximo plies jugadas
function materialAfterLine(fen, pv, plies, color) {
  const c = new Chess(fen);
  for (const u of (pv || []).slice(0, plies)) if (!uciMove(c, u)) break;
  return material(c, color);
}
export function pvToSan(fen, pv, n = 6) {
  const c = new Chess(fen);
  const out = [];
  for (const u of (pv || []).slice(0, n)) {
    const m = uciMove(c, u);
    if (!m) break;
    out.push(m.san);
  }
  return out;
}
// ¿Queda la pieza movida en una casilla atacada y mal defendida?
function isSacrifice(fenAfter, move) {
  if (!['n', 'b', 'r', 'q'].includes(move.piece)) return false;
  const c = new Chess(fenAfter);
  const me = move.color, opp = me === 'w' ? 'b' : 'w';
  const attackers = c.attackers(move.to, opp);
  if (!attackers.length) return false;
  const captured = move.captured ? VAL[move.captured] : 0;
  if (captured >= VAL[move.piece]) return false;
  const defenders = c.attackers(move.to, me);
  const minAtt = Math.min(...attackers.map((s) => VAL[c.get(s).type] || 99));
  return defenders.length === 0 || minAtt < VAL[move.piece];
}
// Tras jugar uci desde fen, ¿la pieza ataca a 2 o más piezas valiosas (o rey + pieza)?
function isFork(fen, uci) {
  const c = new Chess(fen);
  const m = uciMove(c, uci);
  if (!m) return false;
  const opp = m.color === 'w' ? 'b' : 'w';
  const myVal = VAL[m.piece] || 0;
  let n = 0;
  for (const row of c.board()) for (const sq of row) {
    if (!sq || sq.color !== opp) continue;
    if (sq.type === 'p') continue;
    const att = c.attackers(sq.square, m.color);
    if (!att.includes(m.to)) continue;
    const defended = c.attackers(sq.square, opp).length > 0;
    if (sq.type === 'k' || VAL[sq.type] > myVal || !defended) n++;
  }
  return n >= 2;
}
function parseClock(comment) {
  const m = /%clk\s+(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(comment || '');
  return m ? +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]) : null;
}

export function parsePgn(pgn) {
  const c = new Chess();
  c.loadPgn(pgn.trim());
  const headers = c.getHeaders ? c.getHeaders() : c.header();
  const comments = {};
  for (const x of c.getComments()) comments[x.fen] = x.comment;
  const history = c.history({ verbose: true });
  return { headers, history, comments };
}

export function splitPgns(text) {
  const parts = text.replace(/\r/g, '').split(/\n\s*\n(?=\[Event |\[Site )/);
  return parts.map((p) => p.trim()).filter((p) => /\d+\./.test(p));
}

function classifyMove(ctx) {
  const { loss, isBest, winBefore, winAfter, gap, sac, recapture, legalCount, inBook, prevOppLoss, phaseOpening } = ctx;
  if (legalCount === 1) return 'forced';
  if (inBook && loss < 8) return 'book';
  if (loss <= 2) {
    if (sac && winAfter >= 45 && winBefore < 97 && !recapture) return 'brilliant';
    if (isBest && gap >= 20 && winBefore < 95 && winAfter > 30 && !recapture && !phaseOpening) return 'great';
    return isBest || loss < 0.4 ? 'best' : 'excellent';
  }
  if (loss <= 5) return 'good';
  if (prevOppLoss >= 10 && loss >= 10 && winBefore >= 60) return 'miss';
  if (loss <= 10) return 'inaccuracy';
  if (loss <= 20) return 'mistake';
  return 'blunder';
}

function explain(m) {
  const best = m.bestSan ? `Lo mejor era ${m.bestSan}` : '';
  const line = m.bestLine?.length > 1 ? ` (${m.bestLine.slice(0, 4).join(' ')})` : '';
  const t = m.tags || [];
  if (t.includes('allowedMate')) return `Tras ${m.san} el rival tiene mate forzado. ${best}${line}.`;
  if (t.includes('missedMate')) return `Había mate: ${m.bestLine.join(' ')}. Jugaste ${m.san}.`;
  if (t.includes('hanging')) {
    const what = m.lostPiece ? `tu ${PIECE_ES[m.lostPiece]}` : 'material';
    const reply = m.replySan ? ` tras ${m.replySan}` : '';
    return `Con ${m.san} pierdes ${what}${reply}. ${best}${line}.`;
  }
  if (t.includes('missedTactic')) {
    const f = t.includes('fork') ? ' con un ataque doble' : '';
    return `Había una táctica que ganaba material${f}: ${m.bestLine.slice(0, 4).join(' ')}.`;
  }
  if (t.includes('missedPunish')) return `El rival acababa de fallar y no lo aprovechaste. ${best}${line}.`;
  if (t.includes('endgame')) return `Imprecisión técnica en el final. ${best}${line}.`;
  return `${best}${line}.`;
}

export async function analyzeGame(pgn, engine, opts = {}) {
  const depth = opts.depth || 12;
  const { headers, history, comments } = parsePgn(pgn);
  const startFen = history.length ? history[0].before : new Chess().fen();
  const fens = [startFen, ...history.map((h) => h.after)];
  const evals = [];
  for (let i = 0; i < fens.length; i++) {
    const c = new Chess(fens[i]);
    if (c.isCheckmate()) evals.push({ lines: [{ uci: null, cp: -10000, mate: 0, pv: [] }], terminal: true });
    else if (c.isDraw() || c.isStalemate()) evals.push({ lines: [{ uci: null, cp: 0, mate: null, pv: [] }], terminal: true });
    else evals.push(await engine.evaluate(fens[i], { depth, multipv: 2 }));
    opts.onProgress?.(i + 1, fens.length);
    if (opts.signal?.aborted) throw new Error('cancelado');
  }
  // Evaluación desde blancas para cada posición
  const whiteCp = evals.map((e, i) => {
    const cp = lineCp(e.lines[0]);
    return fens[i].split(' ')[1] === 'w' ? cp : -cp;
  });
  const whiteWin = whiteCp.map(winPct);

  let openingName = null, openingEco = null, lastBookPly = -1;
  const moves = [];
  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    const color = h.color;
    const sign = color === 'w' ? 1 : -1;
    const winBefore = color === 'w' ? whiteWin[i] : 100 - whiteWin[i];
    const winAfter = color === 'w' ? whiteWin[i + 1] : 100 - whiteWin[i + 1];
    const loss = Math.max(0, winBefore - winAfter);
    const e = evals[i];
    const l0 = e.lines[0], l1 = e.lines[1];
    const uci = h.from + h.to + (h.promotion || '');
    const isBest = l0?.uci === uci;
    const gap = l1 ? winPct(lineCp(l0)) - winPct(lineCp(l1)) : 0;
    const before = new Chess(fens[i]);
    const legalCount = before.moves().length;
    const op = openingOf(fens[i + 1]);
    const inBook = !!op && i < 30;
    if (op) { openingName = op[1]; openingEco = op[0]; lastBookPly = i; }
    const sac = isSacrifice(fens[i + 1], h);
    const prev = history[i - 1];
    const recapture = !!(prev && prev.captured && h.to === prev.to);
    const prevOppLoss = i > 0 ? moves[i - 1].loss : 0;
    const npm = nonPawnMaterial(before);
    const phase = npm <= 26 ? 'endgame' : i < 24 ? 'opening' : 'middlegame';
    const cls = classifyMove({ loss, isBest, winBefore, winAfter, gap, sac, recapture, legalCount, inBook, prevOppLoss, phaseOpening: phase === 'opening' });

    const m = {
      ply: i, color, san: h.san, uci, from: h.from, to: h.to, fenBefore: fens[i], fenAfter: fens[i + 1],
      cls, loss: +loss.toFixed(1), winBefore: +winBefore.toFixed(1), winAfter: +winAfter.toFixed(1),
      evalAfter: whiteCp[i + 1], phase, tags: [],
      bestUci: l0?.uci || null, bestSan: null, bestLine: [],
      clock: parseClock(comments[h.after]),
    };
    if (l0?.uci && !isBest) {
      m.bestLine = pvToSan(fens[i], l0.pv, 6);
      m.bestSan = m.bestLine[0] || null;
    }
    // Etiquetas para entender POR QUÉ fue un error
    if (['inaccuracy', 'mistake', 'blunder', 'miss'].includes(cls)) {
      const after = evals[i + 1].lines[0];
      const matNow = material(before, color);
      const playedLine = [uci, ...(after?.pv || [])];
      const matPlayed = materialAfterLine(fens[i], playedLine, 6, color);
      const matBest = materialAfterLine(fens[i], l0?.pv, 6, color);
      if (after?.mate != null && after.mate > 0) m.tags.push('allowedMate');
      else if (l0?.mate != null && l0.mate > 0) m.tags.push('missedMate');
      else if (matBest - matPlayed >= 2) {
        if (matPlayed <= matNow - 2) {
          m.tags.push('hanging');
          if (after?.pv?.[0]) {
            const c2 = new Chess(fens[i + 1]);
            const r = uciMove(c2, after.pv[0]);
            if (r) { m.replySan = r.san; if (r.captured) m.lostPiece = r.captured; }
          }
        } else if (matBest >= matNow + 2) {
          m.tags.push('missedTactic');
          if (isFork(fens[i], l0.uci)) m.tags.push('fork');
        } else m.tags.push(phase === 'endgame' ? 'endgame' : 'positional');
      } else m.tags.push(phase === 'endgame' ? 'endgame' : 'positional');
      if (prevOppLoss >= 10) m.tags.push('missedPunish');
      if (phase === 'opening') m.tags.push('opening');
      const base = parseInt(String(headers.TimeControl || '').split('+')[0], 10);
      if (m.clock != null && (m.clock < 60 || (base && m.clock < base * 0.1))) m.tags.push('timeTrouble');
      m.note = explain(m);
    } else if (cls === 'brilliant') m.note = `¡Sacrificio correcto! ${h.san} es la jugada fuerte.`;
    else if (cls === 'great') m.note = `${h.san} era prácticamente la única jugada buena.`;
    moves.push(m);
  }

  const acc = accuracy(whiteWin, moves);
  const result = headers.Result || '*';
  return {
    version: 1, depth, headers, moves, whiteCp, whiteWin,
    opening: openingName ? { eco: openingEco, name: openingName, lastBookPly } : null,
    accuracy: acc, result, analyzedAt: new Date().toISOString(),
  };
}

// Precisión al estilo Lichess (media ponderada por volatilidad + media armónica)
export function accuracy(whiteWin, moves) {
  const n = moves.length;
  if (!n) return { w: null, b: null };
  const win = Math.max(2, Math.min(8, Math.floor(n / 10)));
  const weights = [];
  for (let i = 0; i < n; i++) {
    const s = Math.max(0, Math.min(i + 1 - Math.floor(win / 2), whiteWin.length - win));
    const slice = whiteWin.slice(s, s + win);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const sd = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length);
    weights.push(Math.max(0.5, Math.min(12, sd)));
  }
  const res = {};
  for (const col of ['w', 'b']) {
    let ws = 0, wt = 0, hs = 0, cnt = 0;
    moves.forEach((m, i) => {
      if (m.color !== col) return;
      const a = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * (m.winBefore - m.winAfter)) - 3.1669 + 1));
      ws += a * weights[i]; wt += weights[i];
      hs += 1 / Math.max(a, 1); cnt++;
    });
    res[col] = cnt ? +(((ws / wt) + cnt / hs) / 2).toFixed(1) : null;
  }
  return res;
}

export function countClasses(moves, color) {
  const out = Object.fromEntries(CLASS_ORDER.map((k) => [k, 0]));
  for (const m of moves) if (!color || m.color === color) out[m.cls]++;
  return out;
}
