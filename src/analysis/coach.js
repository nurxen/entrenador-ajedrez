// Estadísticas agregadas de muchas partidas y consejos del entrenador
import { CLASS_ORDER, TAGS } from './analyzer.js';

export function myColor(analysis, username) {
  const u = (username || '').toLowerCase();
  if (u && (analysis.headers.White || '').toLowerCase() === u) return 'w';
  if (u && (analysis.headers.Black || '').toLowerCase() === u) return 'b';
  return null;
}
export function myResult(analysis, color) {
  const r = analysis.result;
  if (r === '1/2-1/2') return 'draw';
  if (r === '1-0') return color === 'w' ? 'win' : 'loss';
  if (r === '0-1') return color === 'b' ? 'win' : 'loss';
  return 'unknown';
}
// Tiempo gastado en cada jugada propia (necesita los relojes %clk que exporta Chess.com)
export function clockStats(analysis, color) {
  const [base, inc = 0] = String(analysis.headers.TimeControl || '').split('+').map(Number);
  const mine = analysis.moves.filter((m) => m.color === color);
  if (!base || !mine.some((m) => m.clock != null)) return null;
  let prev = base;
  const moves = [];
  for (const m of mine) {
    if (m.clock == null) continue;
    moves.push({ ply: m.ply, san: m.san, cls: m.cls, spent: Math.max(0, prev - m.clock + inc), clock: m.clock });
    prev = m.clock;
  }
  const bad = (x) => ['mistake', 'blunder', 'miss'].includes(x.cls);
  const think = moves.filter((x) => x.ply > 16);
  return {
    base, inc, moves,
    avg: moves.reduce((a, b) => a + b.spent, 0) / moves.length,
    rushedErrors: moves.filter((x) => bad(x) && x.spent < 5 && x.ply > 10),
    lowClockErrors: moves.filter((x) => bad(x) && x.clock < Math.max(30, base * 0.1)),
    longest: [...think].sort((a, b) => b.spent - a.spent).slice(0, 3),
    final: moves.at(-1)?.clock ?? null,
    openingTime: moves.filter((x) => x.ply < 20).reduce((a, b) => a + b.spent, 0),
  };
}
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const moveAcc = (m) => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * (m.winBefore - m.winAfter)) - 2.1669));

export function aggregate(games, username) {
  const list = games
    .map((g) => ({ g, color: myColor(g.analysis, username) }))
    .filter((x) => x.color)
    .sort((a, b) => (a.g.playedAt || '').localeCompare(b.g.playedAt || ''));
  const s = {
    games: list.length, results: { win: 0, loss: 0, draw: 0 },
    byColor: { w: { games: 0, win: 0, acc: [] }, b: { games: 0, win: 0, acc: [] } },
    accuracyTrend: [], classes: Object.fromEntries(CLASS_ORDER.map((k) => [k, 0])),
    totalMoves: 0, phase: { opening: [], middlegame: [], endgame: [] },
    phaseErrors: { opening: 0, middlegame: 0, endgame: 0 },
    tags: Object.fromEntries(Object.keys(TAGS).map((k) => [k, 0])),
    openings: {}, blownWins: 0, comebacks: 0, oppBlundersMissed: 0, oppBlunders: 0,
    puzzles: [], ratingTrend: [], rushed: 0, lowClock: 0, timePerMove: [], bookExit: [], clockGames: 0,
  };
  for (const { g, color } of list) {
    const a = g.analysis;
    const res = myResult(a, color);
    if (s.results[res] != null) s.results[res]++;
    const bc = s.byColor[color];
    bc.games++; if (res === 'win') bc.win++;
    const acc = a.accuracy[color];
    if (acc != null) { bc.acc.push(acc); s.accuracyTrend.push({ id: g.id, date: g.playedAt, acc, res }); }
    const elo = parseInt(color === 'w' ? a.headers.WhiteElo : a.headers.BlackElo, 10);
    if (elo) s.ratingTrend.push({ date: g.playedAt, elo });
    let maxWin = 0, minWin = 100;
    a.moves.forEach((m, i) => {
      if (m.color !== color) {
        if (m.loss >= 15) {
          s.oppBlunders++;
          const reply = a.moves[i + 1];
          if (reply && reply.loss >= 10) s.oppBlundersMissed++;
        }
        return;
      }
      s.totalMoves++;
      s.classes[m.cls]++;
      if (m.cls !== 'book' && m.cls !== 'forced') s.phase[m.phase].push(moveAcc(m));
      if (['mistake', 'blunder', 'miss'].includes(m.cls)) {
        s.phaseErrors[m.phase]++;
        for (const t of m.tags) s.tags[t] = (s.tags[t] || 0) + 1;
        if (m.bestUci) s.puzzles.push({ gameId: g.id, ply: m.ply, fen: m.fenBefore, best: m.bestUci, bestSan: m.bestSan, played: m.san, cls: m.cls, tags: m.tags, note: m.note, date: g.playedAt });
      } else if (m.cls === 'inaccuracy') for (const t of m.tags) if (t === 'opening') s.tags.opening++;
      maxWin = Math.max(maxWin, m.winAfter); minWin = Math.min(minWin, m.winAfter);
    });
    const ck = clockStats(a, color);
    if (ck) { s.clockGames++; s.rushed += ck.rushedErrors.length; s.lowClock += ck.lowClockErrors.length; s.timePerMove.push(ck.avg); }
    const exit = a.moves.find((m) => m.color === color && m.cls !== 'book' && m.cls !== 'forced');
    if (exit && a.opening) s.bookExit.push(Math.floor(exit.ply / 2) + 1);
    if (maxWin >= 85 && res !== 'win') s.blownWins++;
    if (minWin <= 15 && res !== 'loss') s.comebacks++;
    const op = a.opening?.name ? a.opening.name.split(':')[0] : 'Desconocida';
    const key = `${color}|${op}`;
    const o = (s.openings[key] ||= { name: op, color, games: 0, win: 0, draw: 0, loss: 0, acc: [], exit: [] });
    o.games++; o[res] = (o[res] || 0) + 1;
    if (exit && a.opening) o.exit.push(Math.floor(exit.ply / 2) + 1);
    const oacc = a.moves.filter((m) => m.color === color && m.phase === 'opening').map(moveAcc);
    if (oacc.length) o.acc.push(avg(oacc));
  }
  s.avgAccuracy = avg(list.map((x) => x.g.analysis.accuracy[x.color]).filter((v) => v != null));
  for (const c of ['w', 'b']) s.byColor[c].avgAcc = avg(s.byColor[c].acc);
  s.phaseAcc = Object.fromEntries(Object.entries(s.phase).map(([k, v]) => [k, avg(v)]));
  s.avgTimePerMove = avg(s.timePerMove);
  s.avgBookExit = avg(s.bookExit);
  s.openingList = Object.values(s.openings).map((o) => ({ ...o, avgAcc: avg(o.acc), avgExit: avg(o.exit) })).sort((a, b) => b.games - a.games);
  s.puzzles.reverse();
  s.advice = advice(s);
  return s;
}

const LICHESS = 'https://lichess.org/training/';
export function advice(s) {
  if (!s.games) return [];
  const out = [];
  const perGame = (n) => n / s.games;
  const tactical = s.tags.hanging + s.tags.missedTactic + s.tags.missedMate + s.tags.allowedMate;
  if (s.tags.hanging > 0) out.push({
    weight: s.tags.hanging * 3, area: 'Táctica defensiva', title: 'Dejas piezas o material sin defender',
    text: `En ${s.tags.hanging} jugada(s) entregaste material sin compensación (${perGame(s.tags.hanging).toFixed(1)} por partida). Antes de soltar la pieza repasa: ¿qué jaques, capturas y amenazas tiene el rival tras mi jugada? ¿Mi pieza queda defendida?`,
    links: [['Piezas colgadas', LICHESS + 'hangingPiece'], ['Defensa', LICHESS + 'defensiveMove']],
  });
  if (s.tags.missedTactic + s.tags.missedMate > 0) out.push({
    weight: (s.tags.missedTactic + s.tags.missedMate * 2) * 2.5, area: 'Visión táctica', title: 'No ves algunas tácticas que ganan',
    text: `Se te escaparon ${s.tags.missedTactic} táctica(s) que ganaban material${s.tags.missedMate ? ` y ${s.tags.missedMate} mate(s)` : ''}${s.tags.fork ? `, ${s.tags.fork} de ellas con ataque doble` : ''}. Haz 15–20 problemas al día y busca primero jugadas forzadas: jaques, capturas y amenazas.`,
    links: [['Ataque doble', LICHESS + 'fork'], ['Clavada', LICHESS + 'pin'], ['Mate en 2', LICHESS + 'mateIn2']],
  });
  if (s.oppBlunders > 0 && s.oppBlundersMissed / s.oppBlunders >= 0.25) out.push({
    weight: s.oppBlundersMissed * 3, area: 'Castigar errores', title: 'No castigas los errores del rival',
    text: `El rival cometió ${s.oppBlunders} error(es) grave(s) y en ${s.oppBlundersMissed} no lo aprovechaste. Cuando el rival juega algo inesperado, para y pregúntate: ¿qué ha dejado de defender?`,
    links: [['Ventaja material', LICHESS + 'advantage']],
  });
  if (s.tags.allowedMate > 0) out.push({
    weight: s.tags.allowedMate * 4, area: 'Seguridad del rey', title: 'Permites mates',
    text: `En ${s.tags.allowedMate} ocasión(es) dejaste un mate. Vigila la casilla de escape del rey y las diagonales abiertas.`,
    links: [['Ataque al rey', LICHESS + 'kingsideAttack'], ['Mate del pasillo', LICHESS + 'backRankMate']],
  });
  const pa = s.phaseAcc;
  const phases = [['opening', 'Apertura'], ['middlegame', 'Medio juego'], ['endgame', 'Final']].filter(([k]) => pa[k] != null);
  if (phases.length >= 2) {
    const worst = phases.reduce((a, b) => (pa[a[0]] < pa[b[0]] ? a : b));
    const tips = {
      opening: ['Revisa tus aperturas', 'Repasa las primeras 10 jugadas de cada partida en la pestaña Aperturas y fija un repertorio corto.', [['Explorador de aperturas', 'https://lichess.org/analysis#explorer']]],
      middlegame: ['Plan y estrategia en el medio juego', 'Antes de mover, identifica la pieza peor colocada y mejórala. Busca debilidades fijas (peones aislados, casillas débiles) y juega hacia ellas.', [['Medio juego', LICHESS + 'middlegame'], ['Estudios de estrategia', 'https://lichess.org/study']]],
      endgame: ['Técnica de finales', 'Activa el rey pronto, crea peones pasados y aprende los finales de torre básicos (Lucena y Philidor).', [['Finales', LICHESS + 'endgame'], ['Práctica de finales', 'https://lichess.org/practice']]],
    }[worst[0]];
    out.push({ weight: Math.max(0, 95 - pa[worst[0]]) / 2 + s.phaseErrors[worst[0]], area: worst[1], title: tips[0], text: `Tu precisión por fases: ${phases.map(([k, n]) => `${n} ${pa[k].toFixed(0)}%`).join(' · ')}. ${tips[1]}`, links: tips[2] });
  }
  if (s.tags.positional > tactical && s.tags.positional > 0) out.push({
    weight: s.tags.positional * 1.5, area: 'Estrategia', title: 'Muchos errores sin táctica de por medio',
    text: `${s.tags.positional} de tus errores no perdían material inmediato: son decisiones de plan. Pregúntate en cada jugada tranquila qué quiere hacer el rival y qué pieza tuya puede mejorar.`,
    links: [['Jugadas tranquilas', LICHESS + 'quietMove']],
  });
  if (s.blownWins > 0) out.push({
    weight: s.blownWins * 4, area: 'Convertir ventaja', title: 'Partidas ganadas que se escapan',
    text: `En ${s.blownWins} partida(s) llegaste a estar claramente ganando y no ganaste. Con ventaja: cambia piezas, no peones; elimina el contrajuego antes de atacar.`,
    links: [['Convertir ventaja', LICHESS + 'crushing']],
  });
  if (s.rushed >= 2) out.push({
    weight: s.rushed * 2.5, area: 'Gestión del tiempo', title: 'Fallas por jugar demasiado rápido',
    text: `${s.rushed} de tus errores los jugaste en menos de 5 segundos con tiempo de sobra en el reloj. En rápidas tienes tiempo: en cada jugada con capturas o jaques en el aire, invierte 10 segundos en el repaso de jaques, capturas y amenazas.`, links: [],
  });
  if (s.tags.timeTrouble >= 2) out.push({
    weight: s.tags.timeTrouble * 2, area: 'Gestión del tiempo', title: 'Fallas con poco tiempo',
    text: `${s.tags.timeTrouble} errores llegaron con menos de 1 minuto. En partidas de 10 minutos intenta llegar a la jugada 20 con al menos 5 minutos.`, links: [],
  });
  return out.sort((a, b) => b.weight - a.weight);
}

// Qué tipo de lección recomendar para cada área del plan
export const AREA_TAG = {
  'Táctica defensiva': 'hanging', 'Visión táctica': 'missedTactic', 'Castigar errores': 'missedPunish',
  'Seguridad del rey': 'allowedMate', Apertura: 'opening', 'Medio juego': 'positional', Final: 'endgame',
  Estrategia: 'positional', 'Convertir ventaja': 'endgame', 'Gestión del tiempo': 'hanging',
};
