import './style.css';
import { Chess } from 'chess.js';
import { analyzeGame, CLASSES, CLASS_ORDER, TAGS, countClasses, winPct, lineCp, splitPgns } from './analysis/analyzer.js';
import { aggregate, myColor, myResult } from './analysis/coach.js';
import { createBrowserEngine } from './engine.js';
import { createBoard } from './board.js';
import { evalGraph, trendChart, bars } from './charts.js';
import { fetchRecentGames, fromPgnText } from './chesscom.js';
import { localGames, getSettings, saveSettings, supabase, currentUser, pushGame, sync, deleteRemote } from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const view = $('#view');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '');
const pct = (v) => (v == null ? '–' : `${Math.round(v)}`);
const RES_ES = { win: 'Victoria', loss: 'Derrota', draw: 'Tablas', unknown: '—' };
const badge = (cls, size = '') => `<span class="cbadge ${size}" style="background:${CLASSES[cls].color}" title="${CLASSES[cls].label}">${CLASSES[cls].sym}</span>`;

let games = [];
let engine = null;
const getEngine = () => (engine ||= createBrowserEngine());

function toast(msg, ms = 3500) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), ms);
}

// ---------------- Datos ----------------
async function loadGames() {
  games = (await localGames.all()).sort((a, b) => (b.playedAt || '').localeCompare(a.playedAt || ''));
}
function decorate(g) {
  const s = getSettings();
  if (g.analysis) {
    g.myColor = myColor(g.analysis, s.username) || g.myColor || null;
    g.myAccuracy = g.myColor ? g.analysis.accuracy[g.myColor] : null;
  } else {
    const u = s.username.toLowerCase();
    g.myColor = (g.white || '').toLowerCase() === u ? 'w' : (g.black || '').toLowerCase() === u ? 'b' : null;
  }
  return g;
}
async function saveGame(g) {
  g.updatedAt = new Date().toISOString();
  decorate(g);
  await localGames.put(g);
  const i = games.findIndex((x) => x.id === g.id);
  if (i >= 0) games[i] = g; else games.push(g);
  games.sort((a, b) => (b.playedAt || '').localeCompare(a.playedAt || ''));
  pushGame(g).catch((e) => console.warn('Supabase', e));
}

// ---------------- Cola de análisis ----------------
const queue = [];
let running = null;
function enqueue(ids) {
  for (const id of ids) if (!queue.includes(id) && running?.id !== id) queue.push(id);
  runQueue();
  renderProgress();
}
async function runQueue() {
  if (running || !queue.length) return;
  const id = queue.shift();
  const g = games.find((x) => x.id === id);
  if (!g) return runQueue();
  running = { id, done: 0, total: 1, label: `${g.white} – ${g.black}` };
  renderProgress();
  try {
    const t0 = performance.now();
    g.analysis = await analyzeGame(g.pgn, getEngine(), {
      depth: +getSettings().depth,
      onProgress: (d, t) => { running.done = d; running.total = t; renderProgress(); },
    });
    g.analysis.seconds = Math.round((performance.now() - t0) / 1000);
    await saveGame(g);
    toast(`Análisis listo: ${g.white} – ${g.black}`);
  } catch (e) {
    console.error(e);
    toast(`No se pudo analizar ${g.white} – ${g.black}: ${e.message}`);
  }
  running = null;
  renderProgress();
  route();
  runQueue();
}
function renderProgress() {
  const el = $('#progress');
  if (!running) { el.hidden = true; return; }
  el.hidden = false;
  const p = Math.round((running.done / running.total) * 100);
  el.innerHTML = `<div class="prog-text">Analizando ${esc(running.label)} · ${p}%${queue.length ? ` · ${queue.length} en cola` : ''}</div><div class="prog-bar"><span style="width:${p}%"></span></div>`;
  const live = document.querySelector(`[data-progress="${running.id}"]`);
  if (live) live.textContent = `Analizando… ${p}%`;
}

// ---------------- Importación ----------------
async function addGames(list, { analyzeNewest = 0 } = {}) {
  const fresh = [];
  for (const g of list) {
    if (games.some((x) => x.id === g.id)) continue;
    await saveGame(g);
    fresh.push(g);
  }
  if (analyzeNewest) enqueue(fresh.slice(0, analyzeNewest).map((g) => g.id));
  return fresh;
}
async function importFromChessCom({ silent = false, analyzeNewest = 3, months = 1 } = {}) {
  const s = getSettings();
  if (!s.username) { if (!silent) location.hash = '#/ajustes'; return []; }
  try {
    const list = await fetchRecentGames(s.username, { months, timeClass: s.timeClass });
    const fresh = await addGames(list, { analyzeNewest });
    if (!silent || fresh.length) toast(fresh.length ? `${fresh.length} partida(s) nueva(s) de Chess.com` : 'No hay partidas nuevas');
    return fresh;
  } catch (e) {
    if (!silent) toast(e.message);
    return [];
  }
}

// ---------------- Router ----------------
const routes = {
  '': viewGames, partidas: viewGames, partida: viewGame, importar: viewImport,
  estadisticas: viewStats, entrenador: viewCoach, ajustes: viewSettings,
};
function route() {
  const [, name = '', ...args] = (location.hash || '#/').split('/');
  const fn = routes[name] || viewGames;
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === (name === 'partida' || name === 'importar' ? 'partidas' : name || 'partidas')));
  if (route.cleanup) { route.cleanup(); route.cleanup = null; }
  fn(...args.map(decodeURIComponent));
}
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

// ---------------- Vista: partidas ----------------
function gameRow(g) {
  const me = g.myColor;
  const res = me && g.analysis ? myResult(g.analysis, me) : me ? myResult({ result: g.result }, me) : 'unknown';
  const opp = me === 'w' ? g.black : me === 'b' ? g.white : `${g.white} – ${g.black}`;
  const oppElo = me === 'w' ? g.blackElo || g.analysis?.headers.BlackElo : me === 'b' ? g.whiteElo || g.analysis?.headers.WhiteElo : '';
  let right;
  if (g.analysis) {
    const c = countClasses(g.analysis.moves, me);
    const flags = ['brilliant', 'great', 'mistake', 'miss', 'blunder'].filter((k) => c[k]).map((k) => `<span class="mini" style="color:${CLASSES[k].color}">${CLASSES[k].sym}${c[k]}</span>`).join('');
    right = `<div class="acc-num">${pct(g.myAccuracy)}</div><div class="flags">${flags}</div>`;
  } else if (running?.id === g.id) right = `<span class="small muted" data-progress="${g.id}">Analizando…</span>`;
  else if (queue.includes(g.id)) right = `<span class="small muted">En cola</span>`;
  else right = `<button class="btn small" data-analyze="${g.id}">Analizar</button>`;
  return `<a class="game-row res-${res}" href="#/partida/${encodeURIComponent(g.id)}">
    <span class="side ${me || ''}" aria-label="${me === 'w' ? 'Blancas' : me === 'b' ? 'Negras' : ''}"></span>
    <div class="g-main"><div class="g-opp">${esc(opp)} ${oppElo ? `<span class="muted">(${oppElo})</span>` : ''}</div>
    <div class="g-meta">${RES_ES[res]} · ${fmtDate(g.playedAt)}${g.analysis?.opening ? ' · ' + esc(g.analysis.opening.name.split(':')[0]) : ''}</div></div>
    <div class="g-right">${right}</div></a>`;
}
function viewGames() {
  const s = getSettings();
  const pending = games.filter((g) => !g.analysis && !queue.includes(g.id) && running?.id !== g.id);
  view.innerHTML = `
    <header class="page-head"><h1>Mis partidas</h1>
      <a class="btn" href="#/importar">Añadir</a></header>
    ${!s.username ? `<div class="notice">Escribe tu usuario de Chess.com en <a href="#/ajustes">Ajustes</a> para traer tus partidas automáticamente.</div>` : ''}
    ${s.username ? `<div class="actions-row"><button class="btn ghost" id="refresh">Buscar partidas nuevas</button>
      ${pending.length > 1 ? `<button class="btn ghost" id="all">Analizar ${pending.length} pendientes</button>` : ''}</div>` : ''}
    ${games.length ? `<div class="game-list">${games.map(gameRow).join('')}</div>` :
      `<div class="empty"><p>Aún no hay partidas.</p><p class="muted">Trae tus partidas de Chess.com o pega un PGN para que el entrenador las analice.</p><a class="btn" href="#/importar">Añadir partidas</a></div>`}`;
  view.querySelectorAll('[data-analyze]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); enqueue([b.dataset.analyze]); viewGames(); }));
  $('#refresh')?.addEventListener('click', async (e) => { e.target.disabled = true; e.target.textContent = 'Buscando…'; await importFromChessCom({ months: 2 }); viewGames(); });
  $('#all')?.addEventListener('click', () => { enqueue(pending.map((g) => g.id)); viewGames(); });
}

// ---------------- Vista: importar ----------------
function viewImport() {
  const s = getSettings();
  view.innerHTML = `
    <header class="page-head"><a class="back" href="#/">‹ Partidas</a><h1>Añadir partidas</h1></header>
    <section class="panel">
      <h2>Desde Chess.com</h2>
      <p class="muted small">Usa la API pública de Chess.com: gratis y sin contraseña.</p>
      <label class="field">Usuario<input id="u" value="${esc(s.username)}" autocapitalize="off" autocomplete="off" placeholder="tu_usuario"></label>
      <label class="field">Ritmo<select id="tc">${[['rapid', 'Rápidas'], ['blitz', 'Blitz'], ['bullet', 'Bala'], ['daily', 'Diarias'], ['all', 'Todas']].map(([v, l]) => `<option value="${v}" ${s.timeClass === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field">Periodo<select id="m"><option value="1">Este mes</option><option value="2" selected>Últimos 2 meses</option><option value="6">Últimos 6 meses</option><option value="12">Último año</option></select></label>
      <button class="btn wide" id="go">Traer partidas</button>
      <div id="ccout"></div>
    </section>
    <section class="panel">
      <h2>Pegar PGN</h2>
      <p class="muted small">En Chess.com: partida terminada → Compartir → PGN → Copiar. Puedes pegar varias seguidas.</p>
      <textarea id="pgn" rows="8" placeholder='[Event "Live Chess"] ... 1. e4 e5 2. Nf3 ...'></textarea>
      <button class="btn wide" id="paste">Analizar PGN</button>
    </section>`;
  $('#go').addEventListener('click', async (e) => {
    const u = $('#u').value.trim();
    if (!u) return toast('Escribe tu usuario de Chess.com');
    saveSettings({ username: u, timeClass: $('#tc').value });
    e.target.disabled = true; e.target.textContent = 'Buscando…';
    try {
      const list = await fetchRecentGames(u, { months: +$('#m').value, timeClass: $('#tc').value });
      const fresh = await addGames(list);
      games.forEach(decorate);
      $('#ccout').innerHTML = `<p class="ok">${list.length} partidas encontradas, ${fresh.length} nuevas.</p>
        ${fresh.length ? `<div class="actions-row"><button class="btn" id="an5">Analizar las 5 últimas</button><button class="btn ghost" id="anall">Analizar todas (${fresh.length})</button></div>
        <p class="muted small">Cada partida tarda entre 20 segundos y 1 minuto en el móvil. Puedes seguir usando la app mientras tanto.</p>` : ''}`;
      $('#an5')?.addEventListener('click', () => { enqueue(fresh.slice(0, 5).map((g) => g.id)); location.hash = '#/'; });
      $('#anall')?.addEventListener('click', () => { enqueue(fresh.map((g) => g.id)); location.hash = '#/'; });
    } catch (err) { toast(err.message); }
    e.target.disabled = false; e.target.textContent = 'Traer partidas';
  });
  $('#paste').addEventListener('click', async () => {
    const parts = splitPgns($('#pgn').value);
    if (!parts.length) return toast('Pega al menos una partida en formato PGN');
    const list = [];
    for (const p of parts) {
      try { list.push(fromPgnText(p)); } catch (e) { toast(`Hay un PGN que no se puede leer: ${e.message}`); }
    }
    for (const g of list) { const ex = games.find((x) => x.id === g.id); if (!ex) await saveGame(g); }
    enqueue(list.map((g) => g.id).filter((id) => !games.find((x) => x.id === id)?.analysis));
    location.hash = list.length === 1 ? `#/partida/${encodeURIComponent(list[0].id)}` : '#/';
  });
}

// ---------------- Vista: partida ----------------
function viewGame(id, tab = 'informe') {
  const g = games.find((x) => x.id === id);
  if (!g) { view.innerHTML = `<div class="empty"><p>Esta partida ya no está guardada.</p><a class="btn" href="#/">Ver partidas</a></div>`; return; }
  if (!g.analysis) {
    const busy = running?.id === g.id || queue.includes(g.id);
    view.innerHTML = `<header class="page-head"><a class="back" href="#/">‹ Partidas</a><h1>${esc(g.white)} – ${esc(g.black)}</h1></header>
      <div class="empty"><p>${busy ? 'El entrenador está analizando esta partida.' : 'Esta partida todavía no está analizada.'}</p>
      ${busy ? `<p class="muted" data-progress="${g.id}">Analizando…</p>` : `<button class="btn" id="an">Analizar ahora</button>`}</div>`;
    $('#an')?.addEventListener('click', () => { enqueue([g.id]); viewGame(id); });
    return;
  }
  const a = g.analysis;
  const me = g.myColor || 'w';
  const H = a.headers;
  const players = { w: [H.White, H.WhiteElo, a.accuracy.w], b: [H.Black, H.BlackElo, a.accuracy.b] };
  const head = `<header class="page-head"><a class="back" href="#/">‹ Partidas</a>
    <div class="seg"><a href="#/partida/${encodeURIComponent(id)}/informe" class="${tab === 'informe' ? 'on' : ''}">Informe</a><a href="#/partida/${encodeURIComponent(id)}/revision" class="${tab !== 'informe' ? 'on' : ''}">Revisión</a></div></header>`;
  if (tab === 'informe') return viewReport(g, head, players, me);
  return viewReview(g, head, players, me, tab);
}

function viewReport(g, head, players, me) {
  const a = g.analysis;
  const cw = countClasses(a.moves, 'w'), cb = countClasses(a.moves, 'b');
  const res = myResult(a, me);
  const mine = a.moves.filter((m) => m.color === me);
  const phaseAcc = ['opening', 'middlegame', 'endgame'].map((p) => {
    const ms = mine.filter((m) => m.phase === p && m.cls !== 'book');
    if (!ms.length) return null;
    const v = ms.reduce((s, m) => s + Math.max(0, 103.1668 * Math.exp(-0.04354 * m.loss) - 2.1669), 0) / ms.length;
    return { p, v: Math.min(100, v), n: ms.length };
  }).filter(Boolean);
  const keys = a.moves.filter((m) => m.color === me && ['blunder', 'mistake', 'miss', 'inaccuracy', 'brilliant', 'great'].includes(m.cls));
  const oppMissed = a.moves.filter((m, i) => m.color !== me && m.loss >= 15);
  const num = (m) => `${Math.floor(m.ply / 2) + 1}${m.color === 'w' ? '.' : '…'}`;
  const top = me === 'w' ? ['w', 'b'] : ['b', 'w'];
  view.innerHTML = head + `
    <section class="report-head res-${res}">
      <div class="verdict">${RES_ES[res]}</div>
      <div class="muted small">${esc(a.opening?.name || 'Apertura sin catalogar')} · ${fmtDate(g.playedAt)}${g.url ? ` · <a href="${esc(g.url)}" target="_blank" rel="noopener">ver en Chess.com</a>` : ''}</div>
      <div class="acc-duel">${top.map((c) => `<div class="pl ${c}"><div class="pl-name">${esc(players[c][0])}${c === me ? ' <span class="you">tú</span>' : ''}</div>
        <div class="pl-elo muted">${players[c][1] || ''}</div><div class="pl-acc">${pct(players[c][2])}</div><div class="muted small">precisión</div></div>`).join('')}</div>
    </section>
    <section class="panel">
      <table class="cls-table"><thead><tr><th>${esc(players[top[0]][0])}</th><th></th><th>${esc(players[top[1]][0])}</th></tr></thead><tbody>
      ${CLASS_ORDER.map((k) => { const x = top[0] === 'w' ? cw : cb, y = top[0] === 'w' ? cb : cw; return `<tr><td class="n">${x[k]}</td><td class="c">${badge(k)} ${CLASSES[k].label}</td><td class="n">${y[k]}</td></tr>`; }).join('')}
      </tbody></table>
    </section>
    ${phaseAcc.length ? `<section class="panel"><h2>Tu precisión por fases</h2>${bars(phaseAcc.map((x) => ({ label: { opening: 'Apertura', middlegame: 'Medio juego', endgame: 'Final' }[x.p], value: x.v, color: x.v >= 85 ? 'var(--win)' : x.v >= 70 ? 'var(--brass)' : 'var(--loss)' })), { max: 100, fmt: (v) => Math.round(v) + '%' })}</section>` : ''}
    <section class="panel"><h2>Momentos clave</h2>
      ${keys.length ? `<ul class="moments">${keys.map((m) => `<li><a href="#/partida/${encodeURIComponent(g.id)}/${m.ply}">${badge(m.cls)}<span class="mv">${num(m)} ${m.san}</span><span class="note">${esc(m.note || CLASSES[m.cls].label)}</span></a></li>`).join('')}</ul>` : '<p class="muted">Ningún error serio en esta partida. Bien jugado.</p>'}
      ${oppMissed.length ? `<p class="muted small">El rival falló gravemente en ${oppMissed.map((m) => `<a href="#/partida/${encodeURIComponent(g.id)}/${m.ply}">${num(m)} ${m.san}</a>`).join(', ')}.</p>` : ''}
    </section>
    <div class="actions-row"><a class="btn wide" href="#/partida/${encodeURIComponent(g.id)}/${keys[0]?.ply ?? 0}">Revisar jugada a jugada</a></div>
    <div class="actions-row"><button class="btn ghost small" id="reanalyze">Volver a analizar</button><button class="btn ghost small danger" id="del">Borrar partida</button></div>
    <p class="muted small center">Stockfish 19 · profundidad ${a.depth}${a.seconds ? ` · ${a.seconds} s` : ''}</p>`;
  $('#reanalyze').addEventListener('click', () => { delete g.analysis; saveGame(g); enqueue([g.id]); viewGame(g.id); });
  $('#del').addEventListener('click', async () => {
    if (!confirm('¿Borrar esta partida y su análisis?')) return;
    await localGames.del(g.id); await deleteRemote(g.id).catch(() => {});
    games = games.filter((x) => x.id !== g.id); location.hash = '#/';
  });
}

function viewReview(g, head, players, me, startArg) {
  const a = g.analysis;
  let ply = Number.isFinite(+startArg) ? Math.min(+startArg, a.moves.length - 1) : -1;
  let showBest = true;
  const opp = me === 'w' ? 'b' : 'w';
  view.innerHTML = head + `
    <div class="pl-strip">${esc(players[opp][0])} <span class="muted">${players[opp][1] || ''}</span></div>
    <div class="board-wrap"><div class="evalbar"><span class="evalfill"></span><span class="evaltxt"></span></div><div id="board"></div></div>
    <div class="pl-strip">${esc(players[me][0])} <span class="muted">${players[me][1] || ''}</span></div>
    <div class="coach-card" id="coach"></div>
    <div class="controls">
      <button class="ctl" data-go="start" aria-label="Inicio">⏮</button><button class="ctl" data-go="prev" aria-label="Anterior">◀</button>
      <button class="ctl" data-go="next" aria-label="Siguiente">▶</button><button class="ctl" data-go="end" aria-label="Final">⏭</button>
      <button class="ctl" data-go="err" aria-label="Siguiente error tuyo">⚑</button></div>
    <div id="graph" class="graph-wrap"></div>
    <div class="movelist" id="moves"></div>`;
  const board = createBoard($('#board'));
  board.set({ flipped: me === 'b' });
  const movesEl = $('#moves');
  const rows = [];
  for (let i = 0; i < a.moves.length; i += 2) rows.push([a.moves[i], a.moves[i + 1]]);
  const notable = new Set(['brilliant', 'great', 'inaccuracy', 'mistake', 'miss', 'blunder', 'book']);
  movesEl.innerHTML = rows.map((r, i) => `<div class="mrow"><span class="mn">${i + 1}.</span>${r.map((m) => m ? `<button class="mv-btn" data-ply="${m.ply}">${notable.has(m.cls) ? `<i style="background:${CLASSES[m.cls].color}"></i>` : ''}${m.san}</button>` : '<span></span>').join('')}</div>`).join('');
  movesEl.addEventListener('click', (e) => { const b = e.target.closest('[data-ply]'); if (b) go(+b.dataset.ply); });
  $('#graph').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    go(Math.round(((e.clientX - r.left) / r.width) * a.moves.length) - 1);
  });
  view.querySelector('.controls').addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    const k = b.dataset.go;
    if (k === 'start') go(-1); else if (k === 'prev') go(ply - 1); else if (k === 'next') go(ply + 1); else if (k === 'end') go(a.moves.length - 1);
    else if (k === 'err') {
      const nxt = a.moves.find((m) => m.ply > ply && m.color === me && ['blunder', 'mistake', 'miss', 'inaccuracy'].includes(m.cls))
        || a.moves.find((m) => m.color === me && ['blunder', 'mistake', 'miss', 'inaccuracy'].includes(m.cls));
      if (nxt) go(nxt.ply); else toast('No tienes errores en esta partida');
    }
  });
  const onKey = (e) => { if (e.key === 'ArrowLeft') go(ply - 1); if (e.key === 'ArrowRight') go(ply + 1); };
  window.addEventListener('keydown', onKey);
  let tx = null;
  const bEl = $('#board');
  bEl.addEventListener('touchstart', (e) => (tx = e.touches[0].clientX), { passive: true });
  bEl.addEventListener('touchend', (e) => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 40) go(ply + (dx < 0 ? 1 : -1)); tx = null; });
  route.cleanup = () => window.removeEventListener('keydown', onKey);

  function evalText(cpWhite) {
    if (Math.abs(cpWhite) >= 9000) return `M${10000 - Math.abs(cpWhite) || ''}`.replace('M0', '#');
    return (cpWhite > 0 ? '+' : '') + (cpWhite / 100).toFixed(1);
  }
  function go(p) {
    ply = Math.max(-1, Math.min(a.moves.length - 1, p));
    const m = a.moves[ply];
    const fen = m ? m.fenAfter : a.moves[0]?.fenBefore || new Chess().fen();
    const arrows = [];
    if (m && showBest && m.bestUci && m.bestUci !== m.uci && !['best', 'book', 'forced', 'brilliant', 'great'].includes(m.cls))
      arrows.push({ from: m.bestUci.slice(0, 2), to: m.bestUci.slice(2, 4), color: '#81b64c' });
    board.set({ fen, last: m ? { from: m.from, to: m.to } : null, badge: m?.cls, arrows, fen_: fen });
    const cp = a.whiteCp[ply + 1];
    const w = a.whiteWin[ply + 1];
    const fill = $('.evalfill');
    fill.style.height = `${me === 'b' ? 100 - w : w}%`;
    view.querySelector('.evalbar').classList.toggle('flipped', me === 'b');
    $('.evaltxt').textContent = evalText(cp);
    const coach = $('#coach');
    if (!m) coach.innerHTML = `<div class="c-line"><strong>Posición inicial</strong></div><p class="muted small">Pulsa ▶ o desliza el tablero. ⚑ salta a tu siguiente error.</p>`;
    else {
      const who = m.color === me ? '' : '<span class="muted">(rival) </span>';
      const n = `${Math.floor(m.ply / 2) + 1}${m.color === 'w' ? '.' : '…'}`;
      const txt = m.note || ({ best: 'Es la mejor jugada.', excellent: 'Casi tan buena como la mejor.', good: 'Jugada correcta.', book: `Teoría de apertura${a.opening && m.ply <= a.opening.lastBookPly ? '' : ''}.`, forced: 'Única jugada legal.' }[m.cls] || '');
      coach.innerHTML = `<div class="c-line">${badge(m.cls, 'lg')}<div><div>${who}<strong>${n} ${m.san}</strong> es ${CLASSES[m.cls].label.toLowerCase()}</div>
        <div class="muted small">${m.tags.filter((t) => t !== 'opening').map((t) => TAGS[t]).join(' · ')}</div></div><span class="c-eval">${evalText(cp)}</span></div>
        ${txt ? `<p>${esc(txt)}</p>` : ''}
        ${m.bestSan && !['best', 'book', 'forced'].includes(m.cls) ? `<button class="btn ghost small" id="toggleBest">${showBest ? 'Ocultar' : 'Mostrar'} la mejor (${m.bestSan})</button>` : ''}
        ${m.clock != null ? `<span class="clock">⏱ ${Math.floor(m.clock / 60)}:${String(Math.floor(m.clock % 60)).padStart(2, '0')}</span>` : ''}`;
      $('#toggleBest')?.addEventListener('click', () => { showBest = !showBest; go(ply); });
    }
    $('#graph').innerHTML = evalGraph(a.whiteWin, a.moves, ply);
    movesEl.querySelectorAll('.mv-btn').forEach((b) => b.classList.toggle('cur', +b.dataset.ply === ply));
    movesEl.querySelector('.cur')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  go(ply);
}

// ---------------- Vista: estadísticas ----------------
function viewStats(range = '25', colorF = 'all') {
  const s = getSettings();
  const analyzed = games.filter((g) => g.analysis && g.myColor && (colorF === 'all' || g.myColor === colorF));
  const subset = range === 'all' ? analyzed : analyzed.slice(0, +range);
  const st = aggregate(subset, s.username);
  const chips = (cur, opts, mk) => `<div class="chips">${opts.map(([v, l]) => `<a class="chip ${cur === v ? 'on' : ''}" href="${mk(v)}">${l}</a>`).join('')}</div>`;
  if (!st.games) {
    view.innerHTML = `<header class="page-head"><h1>Estadísticas</h1></header><div class="empty"><p>Todavía no hay partidas analizadas${s.username ? '' : ' con tu usuario'}.</p>
      <p class="muted">${s.username ? 'Analiza unas cuantas partidas y aquí verás en qué fallas más.' : 'Indica tu usuario de Chess.com en Ajustes para saber qué bando llevabas.'}</p><a class="btn" href="#/${s.username ? '' : 'ajustes'}">${s.username ? 'Ver partidas' : 'Ir a Ajustes'}</a></div>`;
    return;
  }
  const perGame = (k) => (st.classes[k] / st.games).toFixed(1);
  const winRate = Math.round((st.results.win / st.games) * 100);
  const tagItems = Object.entries(st.tags).filter(([k, v]) => v && k !== 'opening' && k !== 'fork').sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: TAGS[k], value: v, color: 'var(--loss)' }));
  view.innerHTML = `
    <header class="page-head"><h1>Estadísticas</h1></header>
    ${chips(range, [['10', 'Últimas 10'], ['25', 'Últimas 25'], ['50', '50'], ['all', 'Todas']], (v) => `#/estadisticas/${v}/${colorF}`)}
    ${chips(colorF, [['all', 'Ambos colores'], ['w', 'Con blancas'], ['b', 'Con negras']], (v) => `#/estadisticas/${range}/${v}`)}
    <section class="kpis">
      <div><b>${pct(st.avgAccuracy)}</b><span>precisión media</span></div>
      <div><b>${winRate}%</b><span>victorias (${st.results.win}/${st.results.draw}/${st.results.loss})</span></div>
      <div><b>${perGame('blunder')}</b><span>errores graves por partida</span></div>
      <div><b>${perGame('mistake')}</b><span>errores por partida</span></div>
    </section>
    <section class="panel"><h2>Precisión partida a partida</h2>${trendChart(st.accuracyTrend)}
      <p class="muted small">Puntos: verde victoria, rojo derrota. Línea dorada: media de las últimas 5.</p></section>
    <section class="panel"><h2>Por fases</h2>${bars([['opening', 'Apertura'], ['middlegame', 'Medio juego'], ['endgame', 'Final']].filter(([k]) => st.phaseAcc[k] != null).map(([k, l]) => ({ label: l, value: st.phaseAcc[k], color: st.phaseAcc[k] >= 85 ? 'var(--win)' : st.phaseAcc[k] >= 70 ? 'var(--brass)' : 'var(--loss)' })), { max: 100, fmt: (v) => Math.round(v) + '%' })}
      <p class="muted small">Errores (no imprecisiones): apertura ${st.phaseErrors.opening}, medio juego ${st.phaseErrors.middlegame}, final ${st.phaseErrors.endgame}.</p></section>
    <section class="panel"><h2>Por qué fallas</h2>${tagItems.length ? bars(tagItems) : '<p class="muted">Sin errores serios en este periodo.</p>'}
      ${st.oppBlunders ? `<p class="muted small">Castigaste ${st.oppBlunders - st.oppBlundersMissed} de ${st.oppBlunders} errores graves del rival. ${st.blownWins ? `Dejaste escapar ${st.blownWins} partida(s) ganada(s).` : ''} ${st.comebacks ? `Salvaste ${st.comebacks} partida(s) perdida(s).` : ''}</p>` : ''}</section>
    <section class="panel"><h2>Tipos de jugada (media por partida)</h2>
      <div class="cls-grid">${CLASS_ORDER.map((k) => `<div>${badge(k)}<b>${perGame(k)}</b><span>${CLASSES[k].label}</span></div>`).join('')}</div></section>
    <section class="panel"><h2>Aperturas</h2>
      <table class="op-table"><thead><tr><th>Apertura</th><th>P</th><th>+ = −</th><th>Prec.</th></tr></thead><tbody>
      ${st.openingList.map((o) => `<tr><td><span class="side ${o.color}"></span>${esc(o.name)}</td><td>${o.games}</td><td>${o.win}/${o.draw}/${o.loss}</td><td>${pct(o.avgAcc)}</td></tr>`).join('')}</tbody></table>
      <p class="muted small">Precisión en las primeras 12 jugadas de cada partida.</p></section>
    ${st.ratingTrend.length > 1 ? `<section class="panel"><h2>Elo</h2>${trendChart(st.ratingTrend.map((r) => ({ ...r, acc: r.elo })), { min: Math.min(...st.ratingTrend.map((r) => r.elo)) - 20, max: Math.max(...st.ratingTrend.map((r) => r.elo)) + 20, label: 'Elo' })}</section>` : ''}`;
}

// ---------------- Vista: entrenador ----------------
const SOLVED_KEY = 'entrenador-resueltos';
const solved = () => { try { return JSON.parse(localStorage.getItem(SOLVED_KEY) || '{}'); } catch { return {}; } };
function viewCoach() {
  const s = getSettings();
  const analyzed = games.filter((g) => g.analysis && g.myColor);
  const st = aggregate(analyzed.slice(0, 30), s.username);
  if (!st.games) {
    view.innerHTML = `<header class="page-head"><h1>Entrenador</h1></header><div class="empty"><p>Analiza algunas partidas y te diré qué entrenar.</p><a class="btn" href="#/">Ver partidas</a></div>`;
    return;
  }
  const sv = solved();
  const pend = st.puzzles.filter((p) => !sv[`${p.gameId}:${p.ply}`]);
  view.innerHTML = `
    <header class="page-head"><h1>Entrenador</h1></header>
    <p class="lead">Basado en tus últimas ${st.games} partidas. Precisión media ${pct(st.avgAccuracy)}.</p>
    <section class="panel puzzle-entry"><h2>Repite tus errores</h2>
      <p>${pend.length ? `Tienes ${pend.length} posiciones de tus partidas en las que fallaste. Encuentra lo que no viste.` : st.puzzles.length ? 'Has resuelto todas tus posiciones. Analiza más partidas para conseguir nuevas.' : 'No hay errores para practicar todavía.'}</p>
      ${st.puzzles.length ? `<a class="btn wide" href="#/entrenador/x" id="startPz">Empezar (${pend.length || st.puzzles.length})</a>` : ''}</section>
    <h2 class="sect">Tu plan</h2>
    ${st.advice.length ? st.advice.map((x, i) => `<article class="advice ${i === 0 ? 'top' : ''}">
      <div class="adv-area">${i === 0 ? 'Prioridad · ' : ''}${esc(x.area)}</div><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p>
      ${x.links.length ? `<div class="links">${x.links.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(l)}</a>`).join('')}</div>` : ''}</article>`).join('') : '<p class="muted">Sin puntos débiles claros. Sigue analizando partidas.</p>'}`;
  $('#startPz')?.addEventListener('click', (e) => { e.preventDefault(); puzzleMode(pend.length ? pend : st.puzzles); });
}
function puzzleMode(list) {
  let i = 0, solvedNow = false, tries = 0;
  const show = () => {
    const p = list[i];
    if (!p) { toast('¡Serie completada!'); viewCoach(); return; }
    solvedNow = false; tries = 0;
    const turn = p.fen.split(' ')[1];
    const g = games.find((x) => x.id === p.gameId);
    const oppName = g ? (turn === 'w' ? g.black : g.white) : '';
    view.innerHTML = `<header class="page-head"><a class="back" href="#/entrenador">‹ Entrenador</a><h1>Posición ${i + 1} de ${list.length}</h1></header>
      <p class="lead">Juegas con ${turn === 'w' ? 'blancas' : 'negras'}${oppName ? ` contra ${esc(oppName)}` : ''}. En la partida jugaste <b>${esc(p.played)}</b> (${CLASSES[p.cls].label.toLowerCase()}). ¿Qué era mejor?</p>
      <div class="board-wrap solo"><div id="board"></div></div>
      <div class="coach-card" id="pzmsg"><p class="muted">Toca una pieza y luego su casilla de destino.</p></div>
      <div class="actions-row"><button class="btn ghost" id="hint">Pista</button><button class="btn ghost" id="sol">Solución</button><button class="btn" id="next">Siguiente</button></div>
      <p class="center small"><a href="#/partida/${encodeURIComponent(p.gameId)}/${p.ply}">Ver en la partida</a></p>`;
    const board = createBoard($('#board'), { onMove: async (mv) => {
      if (solvedNow) return;
      tries++;
      const c = new Chess(p.fen); c.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
      board.set({ fen: c.fen(), last: mv, arrows: [] });
      const msg = $('#pzmsg');
      if (mv.uci === p.best) return win('¡Exacto! Era la mejor jugada.');
      msg.innerHTML = '<p class="muted">Comprobando…</p>';
      const eng = getEngine();
      const [bestE, mineE] = await Promise.all([eng.evaluate(p.fen, { depth: 12, multipv: 1 }), eng.evaluate(c.fen(), { depth: 12, multipv: 1 })]);
      const wb = winPct(lineCp(bestE.lines[0])), wm = c.isCheckmate() ? 100 : 100 - winPct(lineCp(mineE.lines[0]));
      if (wb - wm <= 3) return win('¡Bien! Es tan buena como la del motor.');
      msg.innerHTML = `<p><b>${c.history().slice(-1)[0]}</b> no es suficiente. Inténtalo otra vez.</p>`;
      setTimeout(() => board.set({ fen: p.fen, last: null }), 700);
    } });
    function win(t) {
      solvedNow = true;
      const sv = solved(); if (tries <= 1) sv[`${p.gameId}:${p.ply}`] = Date.now();
      try { localStorage.setItem(SOLVED_KEY, JSON.stringify(sv)); } catch {}
      $('#pzmsg').innerHTML = `<p class="ok">${t}</p>${p.note ? `<p class="muted small">${esc(p.note)}</p>` : ''}`;
    }
    board.set({ fen: p.fen, flipped: turn === 'b', interactive: true, last: null, arrows: [] });
    $('#hint').addEventListener('click', () => {
      const from = p.best.slice(0, 2);
      board.set({ last: { from, to: from }, arrows: [] });
      const piece = new Chess(p.fen).get(from);
      $('#pzmsg').innerHTML = `<p>Mueve ${({ p: 'un peón', n: 'el caballo', b: 'el alfil', r: 'la torre', q: 'la dama', k: 'el rey' })[piece?.type] || 'la pieza'} de ${from}. ${p.tags.includes('missedMate') ? 'Hay mate.' : p.tags.includes('fork') ? 'Busca un ataque doble.' : ''}</p>`;
      tries++;
    });
    $('#sol').addEventListener('click', () => {
      board.set({ arrows: [{ from: p.best.slice(0, 2), to: p.best.slice(2, 4), color: '#81b64c' }] });
      $('#pzmsg').innerHTML = `<p>La solución es <b>${esc(p.bestSan)}</b>.</p> ${p.note ? `<p class="muted small">${esc(p.note)}</p>` : ''}`;
      solvedNow = true;
    });
    $('#next').addEventListener('click', () => { i++; show(); });
  };
  show();
}

// ---------------- Vista: ajustes ----------------
async function viewSettings() {
  const s = getSettings();
  const sb = supabase();
  const user = await currentUser().catch(() => null);
  view.innerHTML = `
    <header class="page-head"><h1>Ajustes</h1></header>
    <section class="panel"><h2>Tu cuenta de Chess.com</h2>
      <label class="field">Usuario<input id="u" value="${esc(s.username)}" autocapitalize="off" autocomplete="off" placeholder="serranilloGm"></label>
      <label class="field">Ritmo que importar<select id="tc">${[['rapid', 'Rápidas'], ['blitz', 'Blitz'], ['bullet', 'Bala'], ['daily', 'Diarias'], ['all', 'Todas']].map(([v, l]) => `<option value="${v}" ${s.timeClass === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" id="auto" ${s.autoImport ? 'checked' : ''}> Al abrir la app, traer y analizar las partidas nuevas</label>
    </section>
    <section class="panel"><h2>Análisis</h2>
      <label class="field">Profundidad de Stockfish<select id="d">${[[10, '10 · rápido'], [12, '12'], [14, '14 · recomendado'], [16, '16'], [18, '18 · lento']].map(([v, l]) => `<option value="${v}" ${+s.depth === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <p class="muted small">Más profundidad es más preciso pero tarda más y gasta más batería.</p>
    </section>
    <section class="panel"><h2>Copia en la nube (Supabase)</h2>
      ${!sb ? `<p class="muted small">Sin configurar: las partidas se guardan solo en este móvil.</p>` : ''}
      <details ${sb ? '' : 'open'}><summary>Conexión</summary>
        <label class="field">URL del proyecto<input id="sbu" value="${esc(s.supabaseUrl)}" placeholder="https://xxxx.supabase.co" autocapitalize="off"></label>
        <label class="field">Clave pública (anon / publishable)<input id="sbk" value="${esc(s.supabaseKey)}" autocapitalize="off"></label>
      </details>
      ${sb ? (user ? `<p>Conectado como <b>${esc(user.email)}</b></p>
        <div class="actions-row"><button class="btn" id="sync">Sincronizar ahora</button><button class="btn ghost" id="out">Cerrar sesión</button></div>` :
        `<label class="field">Correo<input id="em" type="email" autocomplete="email"></label>
         <label class="field">Contraseña<input id="pw" type="password" autocomplete="current-password"></label>
         <div class="actions-row"><button class="btn" id="in">Entrar</button><button class="btn ghost" id="up">Crear cuenta</button></div>`) : ''}
    </section>
    <section class="panel"><h2>Datos</h2>
      <p class="muted small">${games.length} partidas guardadas, ${games.filter((g) => g.analysis).length} analizadas.</p>
      <div class="actions-row"><button class="btn ghost" id="exp">Exportar copia</button><label class="btn ghost">Importar copia<input type="file" id="imp" accept="application/json" hidden></label></div>
      <button class="btn ghost danger small" id="wipe">Borrar todo de este móvil</button>
    </section>
    <section class="panel"><h2>Instalar en el móvil</h2>
      <p class="small">Android (Chrome): menú ⋮ → <b>Añadir a pantalla de inicio</b>. iPhone (Safari): botón compartir → <b>Añadir a pantalla de inicio</b>.</p>
      <p class="small">En Android, una vez instalada, aparece en el menú Compartir de Chess.com: comparte el PGN o el enlace de la partida y se analizará sola.</p>
      ${deferredInstall ? '<button class="btn wide" id="install">Instalar app</button>' : ''}
    </section>
    <p class="muted small center">Motor: Stockfish 19 (GPL‑3). Piezas: Colin M. L. Burnett. Aperturas: lichess-org/chess-openings.</p>`;
  const save = () => {
    const before = getSettings().username;
    saveSettings({ username: $('#u').value.trim(), timeClass: $('#tc').value, autoImport: $('#auto').checked, depth: +$('#d').value, supabaseUrl: $('#sbu').value.trim(), supabaseKey: $('#sbk').value.trim() });
    if (before !== getSettings().username) games.forEach((g) => { decorate(g); localGames.put(g); });
  };
  view.querySelectorAll('input:not([type=file]):not(#em):not(#pw), select').forEach((el) => el.addEventListener('change', () => { save(); toast('Guardado'); if (el.id === 'sbu' || el.id === 'sbk') viewSettings(); }));
  $('#in')?.addEventListener('click', () => auth('signInWithPassword'));
  $('#up')?.addEventListener('click', () => auth('signUp'));
  async function auth(kind) {
    const { error, data } = await supabase().auth[kind]({ email: $('#em').value.trim(), password: $('#pw').value });
    if (error) return toast(error.message);
    if (kind === 'signUp' && !data.session) return toast('Revisa tu correo para confirmar la cuenta y luego entra.', 6000);
    await doSync(); viewSettings();
  }
  $('#out')?.addEventListener('click', async () => { await supabase().auth.signOut(); viewSettings(); });
  $('#sync')?.addEventListener('click', doSync);
  $('#exp').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ version: 1, settings: { ...getSettings(), supabaseKey: undefined }, games })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `entrenador-ajedrez-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  });
  $('#imp').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      for (const g of data.games || []) await localGames.put(g);
      await loadGames(); toast(`${(data.games || []).length} partidas importadas`); viewSettings();
    } catch { toast('El archivo no es una copia válida de esta app'); }
  });
  $('#wipe').addEventListener('click', async () => {
    if (!confirm('Se borrarán todas las partidas de este móvil (la copia en Supabase no se toca). ¿Seguir?')) return;
    await localGames.clear(); games = []; viewSettings();
  });
  $('#install')?.addEventListener('click', () => deferredInstall?.prompt());
}
async function doSync() {
  try {
    const r = await sync();
    if (r.skipped) return;
    await loadGames(); games.forEach(decorate);
    toast(`Sincronizado: ${r.down} descargadas, ${r.up} subidas`);
  } catch (e) { toast(`Supabase: ${e.message}`); }
}

// ---------------- Arranque ----------------
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });

async function handleShare() {
  const q = new URLSearchParams(location.search);
  const text = [q.get('text'), q.get('url'), q.get('title')].filter(Boolean).join('\n');
  if (!text) return;
  history.replaceState(null, '', location.pathname + location.hash);
  if (/\d+\.\s*\S/.test(text) && /\[|1\./.test(text)) {
    try {
      const g = fromPgnText(text);
      if (!games.some((x) => x.id === g.id)) await saveGame(g);
      enqueue([g.id]); location.hash = `#/partida/${encodeURIComponent(g.id)}`;
      return;
    } catch {}
  }
  const id = text.match(/chess\.com\/game\/(?:live\/)?(\d+)/)?.[1];
  if (id) {
    await importFromChessCom({ silent: true, analyzeNewest: 0, months: 2 });
    const g = games.find((x) => x.id === 'cc-' + id);
    if (g) { if (!g.analysis) enqueue([g.id]); location.hash = `#/partida/${encodeURIComponent(g.id)}`; }
    else toast('No encuentro esa partida. Comprueba tu usuario en Ajustes.');
  }
}

(async function start() {
  await loadGames();
  games.forEach(decorate);
  route();
  await handleShare();
  if (supabase()) doSync().then(() => route());
  const s = getSettings();
  if (s.autoImport && s.username) importFromChessCom({ silent: true, analyzeNewest: 3 }).then((f) => f.length && route());
  if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
})();
