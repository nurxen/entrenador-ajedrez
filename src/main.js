// Tipografías incluidas en la app (funcionan sin conexión)
import '@fontsource/bodoni-moda/latin-600.css';
import '@fontsource/bodoni-moda/latin-700.css';
import '@fontsource/bodoni-moda/latin-600-italic.css';
import '@fontsource/bodoni-moda/latin-700-italic.css';
import '@fontsource/jost/latin-400.css';
import '@fontsource/jost/latin-500.css';
import '@fontsource/jost/latin-600.css';
import '@fontsource/courier-prime/latin-400.css';
import '@fontsource/courier-prime/latin-700.css';
import './style.css';
import { Chess } from 'chess.js';
import { analyzeGame, CLASSES, CLASS_ORDER, TAGS, countClasses, winPct, lineCp, splitPgns, pvToSan } from './analysis/analyzer.js';
import { aggregate, myColor, myResult, clockStats, AREA_TAG } from './analysis/coach.js';
import { createBrowserEngine } from './engine.js';
import { createBoard } from './board.js';
import { evalGraph, trendChart, bars, timeChart, activityDots } from './charts.js';
import { fetchRecentGames, fromPgnText } from './chesscom.js';
import { localGames, getSettings, saveSettings, supabase, currentUser, pushGame, sync, deleteRemote } from './store.js';
import { $, esc, fmtDate, pct, badge, toast, san, sanText, evalText } from './ui.js';
import { progress, logActivity, todayLog, streak, lastDays, srsResult, dueList, pullProgress, exportProgress, importProgress } from './progress.js';
import { viewLearn } from './learn/player.js';
import { lessonsForTag } from './learn/lessons.js';
import { shouldShowTutorial, showTutorial, viewGuide } from './onboarding.js';

const view = $('#view');
const RES_ES = { win: 'Victoria', loss: 'Derrota', draw: 'Tablas', unknown: '—' };
const PHASE_ES = { opening: 'Apertura', middlegame: 'Medio juego', endgame: 'Final' };
const ERR = ['mistake', 'blunder', 'miss'];
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

let games = [];
let engine = null;
const getEngine = () => (engine ||= createBrowserEngine());

function applyTheme() { document.documentElement.dataset.board = getSettings().boardTheme || 'madera'; }

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
async function saveGame(g, { touch = true } = {}) {
  if (touch) g.updatedAt = new Date().toISOString();
  decorate(g);
  await localGames.put(g);
  const i = games.findIndex((x) => x.id === g.id);
  if (i >= 0) games[i] = g; else games.push(g);
  games.sort((a, b) => (b.playedAt || '').localeCompare(a.playedAt || ''));
  if (touch) pushGame(g).catch((e) => console.warn('Supabase', e));
}
const analyzedMine = () => games.filter((g) => g.analysis && g.myColor);

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
  if (onListView() || location.hash.includes(encodeURIComponent(id))) route();
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
  aprender: (...args) => viewLearn(view, args, learnCtx()),
  guia: () => viewGuide(view),
};
const TAB_OF = { partida: 'partidas', importar: 'partidas', '': 'partidas', guia: 'ajustes' };
function route() {
  const [, name = '', ...args] = (location.hash || '#/').split('/');
  const fn = routes[name] || viewGames;
  const tab = TAB_OF[name] ?? name;
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
  if (route.cleanup) { route.cleanup(); route.cleanup = null; }
  fn(...args.map(decodeURIComponent));
}
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });
// Solo se repinta solo si el usuario está en una lista (no le interrumpimos una lección o un ejercicio)
function onListView() {
  const [, name = '', sub] = (location.hash || '#/').split('/');
  return ['', 'partidas', 'estadisticas'].includes(name) || (name === 'entrenador' && !sub);
}
const refreshIfList = () => onListView() && route();
function learnCtx() {
  const st = aggregate(analyzedMine().slice(0, 30), getSettings().username);
  const recommendTags = st.advice.map((a) => AREA_TAG[a.area]).filter(Boolean);
  return { getEngine, recommendTags, setCleanup: (fn) => (route.cleanup = fn) };
}

// ---------------- Vista: partidas ----------------
function gameResult(g) {
  const me = g.myColor;
  return me && g.analysis ? myResult(g.analysis, me) : me ? myResult({ result: g.result }, me) : 'unknown';
}
function gameRow(g) {
  const me = g.myColor;
  const res = gameResult(g);
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
    <div class="g-main"><div class="g-opp">${esc(opp)} ${oppElo ? `<span class="muted">(${oppElo})</span>` : ''}${g.reviewed ? '' : g.analysis ? ' <span class="new-dot" title="Sin revisar"></span>' : ''}</div>
    <div class="g-meta"><span class="r">${RES_ES[res]}</span> · ${fmtDate(g.playedAt)}${g.analysis?.opening ? ' · ' + esc(g.analysis.opening.name.split(':')[0]) : ''}</div></div>
    <div class="g-right">${right}</div></a>`;
}
function viewGames(filter = 'todas') {
  const s = getSettings();
  const pending = games.filter((g) => !g.analysis && !queue.includes(g.id) && running?.id !== g.id);
  const f = { todas: () => true, victorias: (g) => gameResult(g) === 'win', derrotas: (g) => gameResult(g) === 'loss', pendientes: (g) => !g.analysis };
  const list = games.filter(f[filter] || f.todas);
  const st = streak();
  view.innerHTML = `
    <header class="page-head"><h1>Mis partidas</h1>
      ${st ? `<span class="streak" title="Días seguidos entrenando">${st} día${st > 1 ? 's' : ''}</span>` : ''}
      <a class="btn" href="#/importar">Añadir</a></header>
    ${!s.username ? `<div class="notice">Escribe tu usuario de Chess.com en <a href="#/ajustes">Ajustes</a> para traer tus partidas automáticamente.</div>` : ''}
    ${s.username ? `<div class="actions-row"><button class="btn ghost" id="refresh">Buscar partidas nuevas</button>
      ${pending.length > 1 ? `<button class="btn ghost" id="all">Analizar ${pending.length} pendientes</button>` : ''}</div>` : ''}
    ${games.length > 4 ? `<div class="chips">${[['todas', 'Todas'], ['victorias', 'Victorias'], ['derrotas', 'Derrotas'], ['pendientes', 'Sin analizar']].map(([v, l]) => `<a class="chip ${filter === v ? 'on' : ''}" href="#/partidas/${v}">${l}</a>`).join('')}</div>` : ''}
    ${games.length ? `<div class="game-list">${list.map(gameRow).join('') || '<p class="muted center">Ninguna partida con este filtro.</p>'}</div>` :
      `<div class="empty"><p>Aún no hay partidas.</p><p class="muted">Trae tus partidas de Chess.com o pega un PGN para que el entrenador las analice. Mientras tanto, echa un vistazo a <a href="#/aprender">Aprender</a>.</p><a class="btn" href="#/importar">Añadir partidas</a></div>`}`;
  view.querySelectorAll('[data-analyze]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); enqueue([b.dataset.analyze]); viewGames(filter); }));
  $('#refresh')?.addEventListener('click', async (e) => { e.target.disabled = true; e.target.textContent = 'Buscando…'; await importFromChessCom({ months: 2 }); viewGames(filter); });
  $('#all')?.addEventListener('click', () => { enqueue(pending.map((g) => g.id)); viewGames(filter); });
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
        <p class="muted small">Cada partida tarda entre 10 segundos y 1 minuto en el móvil. Puedes seguir usando la app mientras tanto.</p>` : ''}`;
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
  if (!g.reviewed) { g.reviewed = true; saveGame(g, { touch: false }); logActivity('reviews'); }
  return viewReview(g, head, players, me, tab);
}

function phaseAccuracy(moves) {
  return ['opening', 'middlegame', 'endgame'].map((p) => {
    const ms = moves.filter((m) => m.phase === p && m.cls !== 'book' && m.cls !== 'forced');
    if (!ms.length) return null;
    const v = ms.reduce((s, m) => s + Math.max(0, 103.1668 * Math.exp(-0.04354 * m.loss) - 2.1669), 0) / ms.length;
    return { p, v: Math.min(100, v), n: ms.length };
  }).filter(Boolean);
}

function viewReport(g, head, players, me) {
  const a = g.analysis;
  const cw = countClasses(a.moves, 'w'), cb = countClasses(a.moves, 'b');
  const res = myResult(a, me);
  const mine = a.moves.filter((m) => m.color === me);
  const phaseAcc = phaseAccuracy(mine);
  const keys = a.moves.filter((m) => m.color === me && ['blunder', 'mistake', 'miss', 'inaccuracy', 'brilliant', 'great'].includes(m.cls));
  const oppMissed = a.moves.filter((m) => m.color !== me && m.loss >= 15);
  const num = (m) => `${Math.floor(m.ply / 2) + 1}${m.color === 'w' ? '.' : '…'}`;
  const top = me === 'w' ? ['w', 'b'] : ['b', 'w'];
  const ck = clockStats(a, me);
  const exit = mine.find((m) => m.cls !== 'book' && m.cls !== 'forced');
  const tagCount = {};
  for (const m of mine) if (ERR.includes(m.cls)) for (const t of m.tags) tagCount[t] = (tagCount[t] || 0) + 1;
  const mainTag = Object.entries(tagCount).filter(([t]) => t !== 'opening').sort((x, y) => y[1] - x[1])[0]?.[0];
  const recLesson = mainTag ? lessonsForTag(mainTag)[0] : null;
  view.innerHTML = head + `
    <section class="report-head res-${res}">
      <div class="verdict">${RES_ES[res]}</div>
      <div class="muted small">${esc(a.opening?.name || 'Apertura sin catalogar')} · ${fmtDate(g.playedAt)}${g.url ? ` · <a href="${esc(g.url)}" target="_blank" rel="noopener">ver en Chess.com</a>` : ''}</div>
      <div class="acc-duel">${top.map((c) => `<div class="pl ${c}"><div class="pl-name">${esc(players[c][0])}${c === me ? ' <span class="you">tú</span>' : ''}</div>
        <div class="pl-elo muted">${players[c][1] || ''}</div><div class="pl-acc">${pct(players[c][2])}</div><div class="muted small">precisión</div></div>`).join('')}</div>
    </section>
    <div class="actions-row"><a class="btn wide" href="#/partida/${encodeURIComponent(g.id)}/${keys.find((k) => k.cls !== 'brilliant' && k.cls !== 'great')?.ply ?? keys[0]?.ply ?? 0}">Revisar jugada a jugada</a></div>
    <section class="panel">
      <table class="cls-table"><thead><tr><th>${esc(players[top[0]][0])}</th><th></th><th>${esc(players[top[1]][0])}</th></tr></thead><tbody>
      ${CLASS_ORDER.map((k) => { const x = top[0] === 'w' ? cw : cb, y = top[0] === 'w' ? cb : cw; return `<tr><td class="n">${x[k]}</td><td class="c">${badge(k)} ${CLASSES[k].label}</td><td class="n">${y[k]}</td></tr>`; }).join('')}
      </tbody></table>
    </section>
    <section class="panel"><h2>Momentos clave</h2>
      ${keys.length ? `<ul class="moments">${keys.map((m) => `<li><a href="#/partida/${encodeURIComponent(g.id)}/${m.ply}">${badge(m.cls)}<span class="mv">${num(m)} ${san(m.san)}</span><span class="note">${esc(sanText(m.note) || CLASSES[m.cls].label)}</span></a></li>`).join('')}</ul>` : '<p class="muted">Ningún error serio en esta partida. Bien jugado.</p>'}
      ${oppMissed.length ? `<p class="muted small">El rival falló gravemente en ${oppMissed.map((m) => `<a href="#/partida/${encodeURIComponent(g.id)}/${m.ply}">${num(m)} ${san(m.san)}</a>`).join(', ')}.</p>` : ''}
      ${recLesson ? `<a class="rec-lesson" href="#/aprender/${recLesson.id}"><span class="muted small">Para trabajar lo que falló hoy</span><b>${esc(recLesson.title)}</b></a>` : ''}
    </section>
    ${phaseAcc.length ? `<section class="panel"><h2>Tu precisión por fases</h2>${bars(phaseAcc.map((x) => ({ label: PHASE_ES[x.p], value: x.v, color: x.v >= 85 ? 'var(--win)' : x.v >= 70 ? 'var(--brass)' : 'var(--loss)' })), { max: 100, fmt: (v) => Math.round(v) + '%' })}
      ${a.opening && exit ? `<p class="muted small">Saliste de la teoría en la jugada ${Math.floor(exit.ply / 2) + 1} (${san(exit.san)}).</p>` : ''}</section>` : ''}
    ${ck ? `<section class="panel"><h2>Uso del reloj</h2>${timeChart(ck.moves)}
      <div class="kpis mini3"><div><b>${Math.round(ck.avg)} s</b><span>por jugada</span></div><div><b>${fmtClock(ck.openingTime)}</b><span>en las 10 primeras</span></div><div><b>${ck.final != null ? fmtClock(ck.final) : '–'}</b><span>al terminar</span></div></div>
      ${ck.rushedErrors.length ? `<p class="small">Fallaste ${ck.rushedErrors.map((x) => `<a href="#/partida/${encodeURIComponent(g.id)}/${x.ply}">${san(x.san)}</a>`).join(', ')} jugando en menos de 5 segundos.</p>` : ''}
      ${ck.longest.length ? `<p class="muted small">Donde más pensaste: ${ck.longest.map((x) => `${san(x.san)} (${fmtClock(x.spent)})`).join(', ')}.</p>` : ''}</section>` : ''}
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
  let explore = null; // { base, line: [moves], fen }
  let evalToken = 0;
  const opp = me === 'w' ? 'b' : 'w';
  view.innerHTML = head + `
    <div class="pl-strip">${esc(players[opp][0])} <span class="muted">${players[opp][1] || ''}</span></div>
    <div class="board-wrap"><div class="evalbar"><span class="evalfill"></span><span class="evaltxt"></span></div><div id="board"></div></div>
    <div class="pl-strip">${esc(players[me][0])} <span class="muted">${players[me][1] || ''}</span></div>
    <div class="coach-card" id="coach"></div>
    <div class="controls six">
      <button class="ctl" data-go="start" aria-label="Inicio">⏮</button><button class="ctl" data-go="prev" aria-label="Anterior">◀</button>
      <button class="ctl" data-go="next" aria-label="Siguiente">▶</button><button class="ctl" data-go="end" aria-label="Final">⏭</button>
      <button class="ctl" data-go="err" aria-label="Siguiente error tuyo" title="Siguiente error tuyo">⚑</button>
      <button class="ctl" data-go="explore" aria-label="Analizar libremente" title="Prueba tus propias jugadas">✥</button></div>
    <div id="graph" class="graph-wrap"></div>
    <div class="movelist" id="moves"></div>`;
  const board = createBoard($('#board'), { onMove: exploreMove });
  board.set({ flipped: me === 'b' });
  const movesEl = $('#moves');
  const rows = [];
  for (let i = 0; i < a.moves.length; i += 2) rows.push([a.moves[i], a.moves[i + 1]]);
  const notable = new Set(['brilliant', 'great', 'inaccuracy', 'mistake', 'miss', 'blunder', 'book']);
  movesEl.innerHTML = rows.map((r, i) => `<div class="mrow"><span class="mn">${i + 1}.</span>${r.map((m) => m ? `<button class="mv-btn" data-ply="${m.ply}">${notable.has(m.cls) ? `<i style="background:${CLASSES[m.cls].color}"></i>` : ''}${san(m.san)}</button>` : '<span></span>').join('')}</div>`).join('');
  movesEl.addEventListener('click', (e) => { const b = e.target.closest('[data-ply]'); if (b) { explore = null; go(+b.dataset.ply); } });
  $('#graph').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    explore = null;
    go(Math.round(((e.clientX - r.left) / r.width) * a.moves.length) - 1);
  });
  view.querySelector('.controls').addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    const k = b.dataset.go;
    if (k === 'explore') { explore ? (explore = null, go(ply)) : startExplore(); return; }
    if (explore) {
      if (k === 'prev') { explore.line.pop(); if (!explore.line.length) { explore = null; go(ply); } else renderExplore(); }
      else { explore = null; go(ply); }
      return;
    }
    if (k === 'start') go(-1); else if (k === 'prev') go(ply - 1); else if (k === 'next') go(ply + 1); else if (k === 'end') go(a.moves.length - 1);
    else if (k === 'err') {
      const nxt = a.moves.find((m) => m.ply > ply && m.color === me && ['blunder', 'mistake', 'miss', 'inaccuracy'].includes(m.cls))
        || a.moves.find((m) => m.color === me && ['blunder', 'mistake', 'miss', 'inaccuracy'].includes(m.cls));
      if (nxt) go(nxt.ply); else toast('No tienes errores en esta partida');
    }
  });
  const onKey = (e) => { if (explore) return; if (e.key === 'ArrowLeft') go(ply - 1); if (e.key === 'ArrowRight') go(ply + 1); };
  window.addEventListener('keydown', onKey);
  let tx = null;
  const bEl = $('#board');
  bEl.addEventListener('touchstart', (e) => (tx = e.touches[0].clientX), { passive: true });
  bEl.addEventListener('touchend', (e) => { if (tx == null || explore) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) go(ply + (dx < 0 ? 1 : -1)); tx = null; });
  route.cleanup = () => { window.removeEventListener('keydown', onKey); evalToken++; };

  function setEvalBar(cpWhite) {
    const w = winPct(cpWhite);
    $('.evalfill').style.height = `${me === 'b' ? 100 - w : w}%`;
    view.querySelector('.evalbar').classList.toggle('flipped', me === 'b');
    $('.evaltxt').textContent = evalText(cpWhite);
  }
  function currentFen() { const m = a.moves[ply]; return m ? m.fenAfter : a.moves[0]?.fenBefore || new Chess().fen(); }
  function go(p) {
    ply = Math.max(-1, Math.min(a.moves.length - 1, p));
    const m = a.moves[ply];
    const arrows = [];
    if (m && showBest && m.bestUci && m.bestUci !== m.uci && !['best', 'book', 'forced', 'brilliant', 'great'].includes(m.cls))
      arrows.push({ from: m.bestUci.slice(0, 2), to: m.bestUci.slice(2, 4), color: '#81b64c' });
    board.set({ fen: currentFen(), last: m ? { from: m.from, to: m.to } : null, badge: m?.cls, arrows, marks: [], interactive: false });
    view.querySelector('[data-go=explore]').classList.remove('on');
    const cp = a.whiteCp[ply + 1];
    setEvalBar(cp);
    const coach = $('#coach');
    if (!m) coach.innerHTML = `<div class="c-line"><strong>Posición inicial</strong></div><p class="muted small">Pulsa ▶ o desliza el tablero. ⚑ salta a tu siguiente error y ✥ te deja probar jugadas propias con el motor.</p>`;
    else {
      const who = m.color === me ? '' : '<span class="muted">(rival) </span>';
      const n = `${Math.floor(m.ply / 2) + 1}${m.color === 'w' ? '.' : '…'}`;
      const txt = sanText(m.note) || ({ best: 'Es la mejor jugada.', excellent: 'Casi tan buena como la mejor.', good: 'Jugada correcta.', book: 'Teoría de apertura.', forced: 'Única jugada legal.' }[m.cls] || '');
      const tagLesson = m.color === me && ERR.includes(m.cls) ? lessonsForTag(m.tags.find((t) => t !== 'opening'))[0] : null;
      coach.innerHTML = `<div class="c-line">${badge(m.cls, 'lg')}<div><div>${who}<strong>${n} ${san(m.san)}</strong> es ${CLASSES[m.cls].label.toLowerCase()}</div>
        <div class="muted small">${m.tags.filter((t) => t !== 'opening').map((t) => TAGS[t]).join(' · ')}</div></div><span class="c-eval">${evalText(cp)}</span></div>
        ${txt ? `<p>${esc(txt)}</p>` : ''}
        <div class="c-actions">${m.bestSan && !['best', 'book', 'forced'].includes(m.cls) ? `<button class="btn ghost small" id="toggleBest">${showBest ? 'Ocultar' : 'Mostrar'} la mejor (${san(m.bestSan)})</button>` : ''}
        ${tagLesson ? `<a class="btn ghost small" href="#/aprender/${tagLesson.id}">Lección: ${esc(tagLesson.title)}</a>` : ''}
        ${m.clock != null ? `<span class="clock">⏱ ${fmtClock(m.clock)}</span>` : ''}</div>`;
      $('#toggleBest')?.addEventListener('click', () => { showBest = !showBest; go(ply); });
    }
    $('#graph').innerHTML = evalGraph(a.whiteWin, a.moves, ply);
    movesEl.querySelectorAll('.mv-btn').forEach((b) => b.classList.toggle('cur', +b.dataset.ply === ply));
    movesEl.querySelector('.cur')?.scrollIntoView({ block: 'nearest' });
  }

  // Tablero de análisis: prueba jugadas desde la posición actual y Stockfish las evalúa
  function startExplore() {
    explore = { base: currentFen(), line: [] };
    renderExplore();
  }
  function exploreMove(mv) {
    if (!explore) return;
    const c = new Chess(explore.base);
    for (const m of explore.line) c.move(m);
    try { const m = c.move({ from: mv.from, to: mv.to, promotion: mv.promotion }); explore.line.push(m.san); } catch { return; }
    renderExplore();
  }
  async function renderExplore() {
    const c = new Chess(explore.base);
    let last = null;
    for (const s of explore.line) last = c.move(s);
    const fen = c.fen();
    board.set({ fen, last: last ? { from: last.from, to: last.to } : null, badge: null, arrows: [], interactive: true });
    view.querySelector('[data-go=explore]').classList.add('on');
    const startPly = ply + 1;
    const lineTxt = explore.line.map((s, j) => `${(startPly + j) % 2 === 0 ? `${Math.floor((startPly + j) / 2) + 1}.` : j === 0 ? `${Math.floor((startPly + j) / 2) + 1}…` : ''}${san(s)}`).join(' ');
    $('#coach').innerHTML = `<div class="c-line"><strong>Analizando por tu cuenta</strong><span class="c-eval" id="xeval">…</span></div>
      <p class="small">${lineTxt ? esc(lineTxt) : 'Mueve cualquier pieza para probar una idea.'}</p>
      <div id="xlines" class="xlines"><p class="muted small">Stockfish está pensando…</p></div>
      <div class="c-actions"><button class="btn ghost small" id="xundo" ${explore.line.length ? '' : 'disabled'}>Deshacer</button><button class="btn ghost small" id="xback">Volver a la partida</button></div>`;
    $('#xundo').addEventListener('click', () => { explore.line.pop(); renderExplore(); });
    $('#xback').addEventListener('click', () => { explore = null; go(ply); });
    if (c.isGameOver()) { $('#xlines').innerHTML = `<p>${c.isCheckmate() ? 'Jaque mate.' : 'Tablas.'}</p>`; $('#xeval').textContent = c.isCheckmate() ? '#' : '0.0'; return; }
    const token = ++evalToken;
    const r = await getEngine().evaluate(fen, { depth: 14, multipv: 3, movetime: 2500 });
    if (token !== evalToken || !explore) return;
    const sign = c.turn() === 'w' ? 1 : -1;
    const best = lineCp(r.lines[0]) * sign;
    $('#xeval').textContent = evalText(best);
    setEvalBar(best);
    $('#xlines').innerHTML = r.lines.map((l) => `<button class="xline" data-u="${l.uci}"><b>${evalText(lineCp(l) * sign)}</b> ${esc(pvToSan(fen, l.pv, 6).map(san).join(' '))}</button>`).join('');
    board.set({ arrows: r.lines[0]?.uci ? [{ from: r.lines[0].uci.slice(0, 2), to: r.lines[0].uci.slice(2, 4), color: '#5c8bb0' }] : [] });
    $('#xlines').addEventListener('click', (e) => { const u = e.target.closest('[data-u]')?.dataset.u; if (u) exploreMove({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); });
  }
  go(ply);
}

// ---------------- Vista: estadísticas ----------------
function viewStats(range = '25', colorF = 'all') {
  const s = getSettings();
  const analyzed = analyzedMine().filter((g) => colorF === 'all' || g.myColor === colorF);
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
  if (st.rushed) tagItems.push({ label: 'Jugaste en menos de 5 s', value: st.rushed, color: 'var(--brass)' });
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
    ${st.clockGames ? `<section class="panel"><h2>Reloj</h2><div class="kpis mini3"><div><b>${Math.round(st.avgTimePerMove)} s</b><span>media por jugada</span></div><div><b>${st.rushed}</b><span>errores por ir rápido</span></div><div><b>${st.lowClock}</b><span>errores con poco tiempo</span></div></div></section>` : ''}
    <section class="panel"><h2>Tipos de jugada (media por partida)</h2>
      <div class="cls-grid">${CLASS_ORDER.map((k) => `<div>${badge(k)}<b>${perGame(k)}</b><span>${CLASSES[k].label}</span></div>`).join('')}</div></section>
    <section class="panel"><h2>Aperturas</h2>
      <table class="op-table"><thead><tr><th>Apertura</th><th>P</th><th>+ = −</th><th>Prec.</th><th>Teoría</th></tr></thead><tbody>
      ${st.openingList.map((o) => `<tr><td><span class="side ${o.color}"></span>${esc(o.name)}</td><td>${o.games}</td><td>${o.win}/${o.draw}/${o.loss}</td><td>${pct(o.avgAcc)}</td><td>${o.avgExit ? 'j. ' + Math.round(o.avgExit) : '–'}</td></tr>`).join('')}</tbody></table>
      <p class="muted small">Precisión en las primeras 12 jugadas. «Teoría»: jugada media en la que sales del libro${st.avgBookExit ? ` (en total, la ${Math.round(st.avgBookExit)})` : ''}.</p>
      <a class="rec-lesson" href="#/aprender/capitulo/repertorio"><span class="muted small">Repasa tus aperturas</span><b>Tu repertorio: Londres y Caro-Kann</b></a></section>
    ${st.ratingTrend.length > 1 ? `<section class="panel"><h2>Elo</h2>${trendChart(st.ratingTrend.map((r) => ({ ...r, acc: r.elo })), { min: Math.min(...st.ratingTrend.map((r) => r.elo)) - 20, max: Math.max(...st.ratingTrend.map((r) => r.elo)) + 20, label: 'Elo' })}</section>` : ''}`;
}

// ---------------- Vista: entrenador ----------------
function viewCoach(sub) {
  const s = getSettings();
  const analyzed = analyzedMine();
  const st = aggregate(analyzed.slice(0, 30), s.username);
  const srs = dueList(st.puzzles);
  const log = todayLog();
  const lastGame = analyzed[0];
  const recTag = st.advice.map((a) => AREA_TAG[a.area]).find(Boolean);
  const recLesson = (recTag ? lessonsForTag(recTag) : []).find((l) => !progress().lessons[l.id]) || lessonsForTag('missedTactic').find((l) => !progress().lessons[l.id]);
  const plan = [
    { done: !lastGame || lastGame.reviewed, text: lastGame ? `Revisa tu última partida contra ${esc(lastGame.myColor === 'w' ? lastGame.black : lastGame.white)}` : 'Analiza una partida', href: lastGame ? `#/partida/${encodeURIComponent(lastGame.id)}/revision` : '#/importar' },
    { done: (log.puzzles || 0) >= 5, text: `Resuelve 5 posiciones (${Math.min(5, log.puzzles || 0)}/5)`, href: '#/entrenador/repaso' },
    { done: (log.lessons || 0) + (log.drills || 0) >= 1, text: recLesson ? `Estudia: ${esc(recLesson.title)}` : 'Estudia una lección', href: recLesson ? `#/aprender/${recLesson.id}` : '#/aprender' },
  ];
  const stk = streak();
  if (sub === 'repaso') {
    const q = srs.queue.length ? srs.queue : st.puzzles;
    if (!q.length) { toast('Aún no hay posiciones de tus partidas. Mientras tanto, prueba los ejercicios de Aprender.'); location.hash = '#/aprender/capitulo/tactica'; return; }
    return puzzleMode(q.slice(0, 10));
  }
  view.innerHTML = `
    <header class="page-head"><h1>Entrenador</h1>${stk ? `<span class="streak">${stk} día${stk > 1 ? 's' : ''}</span>` : ''}</header>
    <section class="panel today"><h2>Plan de hoy</h2>
      <ul class="plan">${plan.map((p) => `<li class="${p.done ? 'done' : ''}"><a href="${p.href}"><span class="pchk">${p.done ? '✓' : ''}</span>${p.text}</a></li>`).join('')}</ul>
      ${activityDots(lastDays(21))}<p class="muted small">Últimas 3 semanas. Cada día que entrenas suma a tu racha.</p></section>
    ${st.games ? `
    <section class="panel puzzle-entry"><h2>Repite tus errores</h2>
      <p>${srs.due.length ? `Hoy tocan <b>${srs.due.length}</b> posiciones de repaso` : 'Nada pendiente de repaso hoy'}${srs.fresh.length ? ` y tienes <b>${srs.fresh.length}</b> nuevas` : ''}. ${srs.mastered ? `Dominas ${srs.mastered}.` : ''}</p>
      <p class="muted small">Si aciertas a la primera, la posición vuelve dentro de 1, 3, 7, 16 y 35 días. Si fallas, vuelve mañana.</p>
      ${st.puzzles.length ? `<a class="btn wide" href="#/entrenador/repaso">${srs.queue.length ? `Empezar (${Math.min(10, srs.queue.length)})` : 'Repasar igualmente'}</a>` : ''}</section>
    <p class="lead">Basado en tus últimas ${st.games} partidas. Precisión media ${pct(st.avgAccuracy)}.</p>
    <h2 class="sect">Tu plan de mejora</h2>
    ${st.advice.length ? st.advice.map((x, i) => { const les = lessonsForTag(AREA_TAG[x.area])[0]; return `<article class="advice ${i === 0 ? 'top' : ''}">
      <div class="adv-area">${i === 0 ? 'Prioridad · ' : ''}${esc(x.area)}</div><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p>
      <div class="links">${les ? `<a class="int" href="#/aprender/${les.id}">Lección: ${esc(les.title)}</a>` : ''}${x.links.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(l)}</a>`).join('')}</div></article>`; }).join('') : '<p class="muted">Sin puntos débiles claros. Sigue analizando partidas.</p>'}` :
    `<div class="empty"><p>Analiza algunas partidas y te diré qué entrenar.</p><p class="muted">Mientras tanto, empieza por la biblioteca.</p><a class="btn" href="#/aprender">Ir a Aprender</a></div>`}`;
}
function puzzleMode(list) {
  let i = 0, solvedNow = false, tries = 0, hinted = false;
  const show = () => {
    const p = list[i];
    if (!p) { toast('¡Serie completada!'); location.hash = '#/entrenador'; return; }
    solvedNow = false; tries = 0; hinted = false;
    const key = `${p.gameId}:${p.ply}`;
    const turn = p.fen.split(' ')[1];
    const g = games.find((x) => x.id === p.gameId);
    const oppName = g ? (turn === 'w' ? g.black : g.white) : '';
    view.innerHTML = `<header class="page-head"><a class="back" href="#/entrenador">‹ Entrenador</a><span class="muted">${i + 1} / ${list.length}</span></header>
      <p class="lead">Juegas con ${turn === 'w' ? 'blancas' : 'negras'}${oppName ? ` contra ${esc(oppName)}` : ''}. En la partida jugaste <b>${esc(san(p.played))}</b> (${CLASSES[p.cls].label.toLowerCase()}). ¿Qué era mejor?</p>
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
      msg.innerHTML = `<p><b>${san(c.history().slice(-1)[0])}</b> no es suficiente. Inténtalo otra vez.</p>`;
      setTimeout(() => board.set({ fen: p.fen, last: null }), 700);
    } });
    function win(t) {
      solvedNow = true;
      srsResult(key, tries <= 1 && !hinted);
      $('#pzmsg').innerHTML = `<p class="ok">${t}</p>${p.note ? `<p class="muted small">${esc(sanText(p.note))}</p>` : ''}<p class="muted small">${tries <= 1 && !hinted ? 'A la primera: volverá más adelante.' : 'Volverá mañana para afianzarla.'}</p>`;
    }
    board.set({ fen: p.fen, flipped: turn === 'b', interactive: true, last: null, arrows: [] });
    $('#hint').addEventListener('click', () => {
      const from = p.best.slice(0, 2);
      hinted = true;
      board.set({ marks: [from], arrows: [] });
      const piece = new Chess(p.fen).get(from);
      $('#pzmsg').innerHTML = `<p>Mueve ${({ p: 'un peón', n: 'el caballo', b: 'el alfil', r: 'la torre', q: 'la dama', k: 'el rey' })[piece?.type] || 'la pieza'} marcado. ${p.tags.includes('missedMate') ? 'Hay mate.' : p.tags.includes('fork') ? 'Busca un ataque doble.' : p.tags.includes('hanging') ? 'Primero, pon a salvo tu material.' : ''}</p>`;
    });
    $('#sol').addEventListener('click', () => {
      board.set({ arrows: [{ from: p.best.slice(0, 2), to: p.best.slice(2, 4), color: '#81b64c' }] });
      $('#pzmsg').innerHTML = `<p>La solución es <b>${esc(san(p.bestSan))}</b>.</p> ${p.note ? `<p class="muted small">${esc(sanText(p.note))}</p>` : ''}`;
      if (!solvedNow) srsResult(key, false);
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
  const THEMES = [['madera', 'Madera', '#e6d2a8', '#a97a50'], ['verde', 'Torneo', '#eeeed2', '#769656'], ['azul', 'Azul', '#dee3e6', '#8ca2ad'], ['marmol', 'Mármol', '#ece8e1', '#a39a8f']];
  view.innerHTML = `
    <header class="page-head"><h1>Ajustes</h1></header>
    <section class="panel"><h2>Tu cuenta de Chess.com</h2>
      <label class="field">Usuario<input id="u" value="${esc(s.username)}" autocapitalize="off" autocomplete="off" placeholder="serranilloGm"></label>
      <label class="field">Ritmo que importar<select id="tc">${[['rapid', 'Rápidas'], ['blitz', 'Blitz'], ['bullet', 'Bala'], ['daily', 'Diarias'], ['all', 'Todas']].map(([v, l]) => `<option value="${v}" ${s.timeClass === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" id="auto" ${s.autoImport ? 'checked' : ''}> Al abrir la app, traer y analizar las partidas nuevas</label>
    </section>
    <section class="panel"><h2>Tablero y notación</h2>
      <div class="themes">${THEMES.map(([v, l, a, b]) => `<label class="theme ${(s.boardTheme || 'madera') === v ? 'on' : ''}"><input type="radio" name="th" value="${v}" ${(s.boardTheme || 'madera') === v ? 'checked' : ''}><span class="sw" style="background:linear-gradient(135deg, ${a} 50%, ${b} 50%)"></span>${l}</label>`).join('')}</div>
      <label class="field">Notación<select id="nota"><option value="es" ${s.notation !== 'en' ? 'selected' : ''}>Española (R D T A C)</option><option value="en" ${s.notation === 'en' ? 'selected' : ''}>Inglesa (K Q R B N), como Chess.com</option></select></label>
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
      <p class="muted small">${games.length} partidas guardadas, ${games.filter((g) => g.analysis).length} analizadas, ${Object.keys(progress().lessons).length} lecciones completadas.</p>
      <div class="actions-row"><button class="btn ghost" id="exp">Exportar copia</button><label class="btn ghost">Importar copia<input type="file" id="imp" accept="application/json" hidden></label></div>
      <button class="btn ghost danger small" id="wipe">Borrar partidas de este móvil</button>
    </section>
    <section class="panel"><h2>Ayuda</h2>
      <div class="actions-row"><a class="btn" href="#/guia">Guía de uso</a><button class="btn ghost" id="tut">Ver el tutorial</button></div>
    </section>
    <section class="panel"><h2>Instalar en el móvil</h2>
      <p class="small">Android (Chrome): menú ⋮ → <b>Añadir a pantalla de inicio</b>. iPhone (Safari): botón compartir → <b>Añadir a pantalla de inicio</b>.</p>
      <p class="small">En Android, una vez instalada, aparece en el menú Compartir de Chess.com: comparte el PGN o el enlace de la partida y se analizará sola.</p>
      ${deferredInstall ? '<button class="btn wide" id="install">Instalar app</button>' : ''}
    </section>
    <p class="muted small center">Versión 2 · Motor: Stockfish 19 (GPL‑3). Piezas: Colin M. L. Burnett. Aperturas: lichess-org/chess-openings.</p>`;
  const save = () => {
    const before = getSettings().username;
    saveSettings({ username: $('#u').value.trim(), timeClass: $('#tc').value, autoImport: $('#auto').checked, depth: +$('#d').value, notation: $('#nota').value,
      boardTheme: view.querySelector('input[name=th]:checked')?.value || 'madera', supabaseUrl: $('#sbu').value.trim(), supabaseKey: $('#sbk').value.trim() });
    applyTheme();
    if (before !== getSettings().username) games.forEach((g) => { decorate(g); localGames.put(g); });
  };
  view.querySelectorAll('input:not([type=file]):not(#em):not(#pw), select').forEach((el) => el.addEventListener('change', () => {
    save(); toast('Guardado');
    if (['sbu', 'sbk'].includes(el.id) || el.name === 'th') viewSettings();
  }));
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
    const blob = new Blob([JSON.stringify({ version: 2, settings: { ...getSettings(), supabaseKey: undefined }, progress: exportProgress(), games })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `entrenador-ajedrez-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  });
  $('#imp').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      for (const g of data.games || []) await localGames.put(g);
      if (data.progress) importProgress(data.progress);
      await loadGames(); games.forEach(decorate); toast(`${(data.games || []).length} partidas importadas`); viewSettings();
    } catch { toast('El archivo no es una copia válida de esta app'); }
  });
  $('#wipe').addEventListener('click', async () => {
    if (!confirm('Se borrarán todas las partidas de este móvil (la copia en Supabase y tu progreso de lecciones no se tocan). ¿Seguir?')) return;
    await localGames.clear(); games = []; viewSettings();
  });
  $('#install')?.addEventListener('click', () => deferredInstall?.prompt());
  $('#tut').addEventListener('click', () => showTutorial({ onFinish: () => { games.forEach(decorate); viewSettings(); } }));
}
async function doSync() {
  try {
    const r = await sync();
    if (r.skipped) return;
    await pullProgress();
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
      if (!games.find((x) => x.id === g.id)?.analysis) enqueue([g.id]);
      location.hash = `#/partida/${encodeURIComponent(g.id)}`;
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
  applyTheme();
  await loadGames();
  games.forEach(decorate);
  route();
  await handleShare();
  if (supabase()) doSync().then(refreshIfList);
  const s = getSettings();
  if (shouldShowTutorial() && !location.search.includes('text=')) {
    showTutorial({ onFinish: async ({ goImport }) => {
      games.forEach(decorate);
      location.hash = '#/';
      route();
      if (goImport) { await importFromChessCom({ months: 2, analyzeNewest: 3 }); refreshIfList(); }
    } });
  } else if (s.autoImport && s.username) importFromChessCom({ silent: true, analyzeNewest: 3 }).then((f) => f.length && refreshIfList());
  if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
})();
