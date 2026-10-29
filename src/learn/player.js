// Pestaña Aprender: biblioteca, lecciones paso a paso, partidas comentadas, práctica de aperturas y glosario
import { Chess } from 'chess.js';
import { CHAPTERS, GLOSSARY, allLessons, lessonById } from './lessons.js';
import { createBoard } from '../board.js';
import { $, esc, md, san, sanList, toast, evalText } from '../ui.js';
import { progress, markLesson, lessonDone, markDrill, logActivity } from '../progress.js';
import { winPct, lineCp } from '../analysis/analyzer.js';

const arrowsOf = (list = [], color = '#d9a84e') => list.map((u) => ({ from: u.slice(0, 2), to: u.slice(2, 4), color }));
const LEVEL_CLASS = { Básico: 'lv1', Intermedio: 'lv2', Avanzado: 'lv3' };
const levelChip = (l) => (l ? `<span class="lv ${LEVEL_CLASS[l] || ''}">${l}</span>` : '');

export function viewLearn(view, args, ctx) {
  const [a, b, c] = args;
  if (!a) return home(view, ctx);
  if (a === 'glosario') return glossary(view);
  if (a === 'capitulo') return chapter(view, b);
  if (a === 'practica') return drill(view, b, +c || 0, ctx);
  const l = lessonById(a);
  if (!l) { view.innerHTML = `<div class="empty"><p>Esa lección no existe.</p><a class="btn" href="#/aprender">Ver biblioteca</a></div>`; return; }
  if (l.type === 'game') return gameLesson(view, l, ctx);
  if (l.type === 'bio') return bio(view, l);
  return lesson(view, l, ctx, +b || 0);
}

// ───────── Biblioteca ─────────
function home(view, ctx) {
  const all = allLessons().filter((l) => l.type !== 'bio');
  const done = all.filter((l) => lessonDone(l.id)).length;
  const next = all.find((l) => !lessonDone(l.id));
  const rec = (ctx.recommendTags || []).flatMap((t) => all.filter((l) => (l.tag || []).includes(t) && !lessonDone(l.id))).filter((l, i, arr) => arr.indexOf(l) === i).slice(0, 3);
  view.innerHTML = `
    <header class="page-head"><h1>Aprender</h1><a class="btn ghost small" href="#/aprender/glosario">Glosario</a></header>
    <section class="book-progress">
      <div class="bp-num"><b>${done}</b>/${all.length}</div>
      <div class="bp-text"><div>lecciones completadas</div><div class="bp-bar"><span style="width:${(done / all.length) * 100}%"></span></div></div>
    </section>
    ${next ? `<a class="continue" href="#/aprender/${next.id}"><span class="muted small">${done ? 'Continúa por aquí' : 'Empieza por aquí'}</span><b>${esc(next.title)}</b><span class="muted small">${esc(next.summary)}</span></a>` : ''}
    ${rec.length ? `<h2 class="sect">Recomendadas por tus errores</h2><div class="lesson-list">${rec.map(lessonRow).join('')}</div>` : ''}
    <h2 class="sect">Capítulos</h2>
    <div class="chapters">${CHAPTERS.map((ch) => {
      const ls = ch.lessons, d = ls.filter((l) => lessonDone(l.id)).length;
      return `<a class="chapter" href="#/aprender/capitulo/${ch.id}"><div class="ch-title">${esc(ch.title)}</div>
        <div class="ch-desc">${esc(ch.desc)}</div><div class="ch-meta">${ls.length} ${ch.id === 'referentes' ? 'jugadores' : 'lecciones'}${ch.id === 'referentes' ? '' : ` · ${d} hechas`}</div></a>`;
    }).join('')}</div>`;
}
function lessonRow(l) {
  const done = lessonDone(l.id);
  return `<a class="lesson-row ${done ? 'done' : ''}" href="#/aprender/${l.id}">
    <span class="lr-check">${done ? '✓' : ''}</span>
    <div class="lr-main"><div class="lr-title">${esc(l.title)} ${levelChip(l.level)}</div><div class="lr-sum">${esc(l.type === 'bio' ? l.years : l.summary)}</div></div></a>`;
}
function chapter(view, id) {
  const ch = CHAPTERS.find((c) => c.id === id);
  if (!ch) { location.hash = '#/aprender'; return; }
  view.innerHTML = `<header class="page-head"><a class="back" href="#/aprender">‹ Aprender</a><h1>${esc(ch.title)}</h1></header>
    <p class="lead">${esc(ch.desc)}</p><div class="lesson-list">${ch.lessons.map(lessonRow).join('')}</div>`;
}
function glossary(view) {
  view.innerHTML = `<header class="page-head"><a class="back" href="#/aprender">‹ Aprender</a><h1>Glosario</h1></header>
    <dl class="glossary">${GLOSSARY.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>`;
}
function bio(view, l) {
  view.innerHTML = `<header class="page-head"><a class="back" href="#/aprender/capitulo/referentes">‹ Referentes</a></header>
    <article class="bio"><h1>${esc(l.title)}</h1><p class="muted">${esc(l.years)}</p><div class="prose">${md(l.text)}</div>
    ${l.link ? `<a class="btn wide" href="#/aprender/${l.link}">${esc(lessonById(l.link)?.title || 'Ver lección')}</a>` : ''}</article>`;
}

// ───────── Lección paso a paso ─────────
function buildSteps(l) {
  let fen = new Chess().fen();
  return l.steps.map((st) => {
    if (st.fen) fen = st.fen;
    else if (st.line !== undefined) { const c = new Chess(); for (const s of sanList(st.line)) c.move(s); fen = c.fen(); }
    const base = fen;
    const c = new Chess(fen);
    if (st.puzzle) for (const s of st.puzzle.solution.split(' ')) c.move(s);
    const afterPuzzle = c.fen();
    for (const s of st.moves || []) c.move(s);
    fen = c.fen();
    return { ...st, base, afterPuzzle, end: fen };
  });
}

function lesson(view, l, ctx, startStep) {
  const steps = buildSteps(l);
  const ch = CHAPTERS.find((c) => c.id === l.chapter);
  let i = Math.min(startStep, steps.length - 1);
  const firstFen = steps.find((s) => s.puzzle)?.base || steps[0].base;
  const flip = new Chess(firstFen).turn() === 'b' && steps.some((s) => s.puzzle);
  view.innerHTML = `<header class="page-head"><a class="back" href="#/aprender/capitulo/${ch.id}">‹ ${esc(ch.title)}</a><span class="muted small" id="stepn"></span></header>
    <h1 class="lesson-title">${esc(l.title)}</h1>
    <div class="board-wrap solo"><div id="board"></div></div>
    <div class="lesson-text" id="ltext"></div>
    <div class="step-nav"><button class="btn ghost" id="prev">Anterior</button><button class="btn" id="next">Siguiente</button></div>
    <div id="drills"></div>`;
  const board = createBoard($('#board'));
  board.set({ flipped: flip });
  let cleanup = null;
  function show() {
    cleanup?.(); cleanup = null;
    const st = steps[i];
    $('#stepn').textContent = `${i + 1} / ${steps.length}`;
    $('#prev').disabled = i === 0;
    $('#next').textContent = i === steps.length - 1 ? 'Terminar lección' : 'Siguiente';
    board.set({ fen: st.base, last: null, arrows: arrowsOf(st.arrows), marks: st.marks || [], interactive: false, badge: null });
    const t = $('#ltext');
    t.innerHTML = `<div class="prose">${md(st.text)}</div>`;
    if (st.puzzle) cleanup = runPuzzle(board, st, t, ctx, () => {
      if (st.moves) appendMoves(st, t, board, st.afterPuzzle);
    });
    else if (st.moves) appendMoves(st, t, board, st.base);
  }
  $('#prev').addEventListener('click', () => { if (i > 0) { i--; show(); } });
  $('#next').addEventListener('click', () => {
    if (i < steps.length - 1) { i++; show(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    markLesson(l.id);
    finish(view, l);
  });
  if (l.drills?.length) $('#drills').innerHTML = `<section class="panel"><h2>Practica estas líneas</h2><p class="muted small">La app juega las jugadas del rival y tú las tuyas. Repite hasta hacerlas sin fallos.</p>
    ${l.drills.map((d, k) => { const dr = progress().drills[`${l.id}:${k}`]; return `<a class="drill-row" href="#/aprender/practica/${l.id}/${k}"><span class="side ${d.side}"></span><span>${esc(d.name)}</span><span class="muted small">${dr ? `${dr.perfect}/${dr.n} perfectas` : 'sin practicar'}</span></a>`; }).join('')}</section>`;
  show();
}

// Mini reproductor de jugadas dentro de un paso
function appendMoves(st, t, board, startFen) {
  const box = document.createElement('div');
  box.className = 'step-moves';
  t.appendChild(box);
  let k = 0;
  const c = new Chess(startFen);
  const hist = [];
  for (const s of st.moves) { const m = c.move(s); hist.push(m); }
  const startPly = (() => { const parts = startFen.split(' '); return (parseInt(parts[5], 10) - 1) * 2 + (parts[1] === 'b' ? 1 : 0); })();
  function render() {
    box.innerHTML = `<div class="sm-line">${hist.map((m, j) => `<button class="sm-mv ${j < k ? 'played' : ''} ${j === k - 1 ? 'cur' : ''}" data-j="${j + 1}">${(startPly + j) % 2 === 0 ? `${Math.floor((startPly + j) / 2) + 1}.` : j === 0 ? `${Math.floor((startPly + j) / 2) + 1}…` : ''}${san(m.san)}</button>`).join(' ')}</div>
      <div class="sm-ctl"><button class="ctl" data-k="0" aria-label="Inicio">⏮</button><button class="ctl" data-k="-1" aria-label="Anterior">◀</button><button class="ctl" data-k="+1" aria-label="Siguiente">▶</button><button class="ctl" data-k="all" aria-label="Final">⏭</button></div>`;
    const m = hist[k - 1];
    board.set({ fen: m ? m.after : startFen, last: m ? { from: m.from, to: m.to } : null, arrows: k === 0 ? arrowsOf(st.arrows) : [], marks: k === 0 ? st.marks || [] : [] });
  }
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k],[data-j]'); if (!b) return;
    if (b.dataset.j) k = +b.dataset.j;
    else { const v = b.dataset.k; k = v === 'all' ? hist.length : v === '0' ? 0 : Math.max(0, Math.min(hist.length, k + +v)); }
    render();
  });
  render();
}

// Ejercicio: el usuario juega las jugadas de su bando y la app responde
function runPuzzle(board, st, t, ctx, onDone) {
  const sol = st.puzzle.solution.split(' ');
  const c = new Chess(st.base);
  const me = c.turn();
  let k = 0, done = false, mistakes = 0, alive = true;
  const msg = document.createElement('div');
  msg.className = 'pz-box';
  t.appendChild(msg);
  const say = (h) => (msg.innerHTML = h + (done ? '' : `<div class="actions-row"><button class="btn ghost small" data-a="hint">Pista</button><button class="btn ghost small" data-a="sol">Ver solución</button></div>`));
  say(`<p class="pz-turn"><span class="side ${me}"></span>Juegan ${me === 'w' ? 'blancas' : 'negras'}. Toca una pieza y su destino.</p>`);
  board.set({ interactive: true });
  const finishOk = (text) => {
    done = true; board.set({ interactive: false });
    say(`<p class="ok">${text}</p>`);
    if (!mistakes) logActivity('puzzles');
    onDone?.();
  };
  const autoReply = () => {
    if (k < sol.length && c.turn() !== me) {
      setTimeout(() => {
        if (!alive) return;
        const m = c.move(sol[k++]);
        board.set({ fen: c.fen(), last: { from: m.from, to: m.to } });
        if (k >= sol.length) finishOk('¡Resuelto!');
      }, 550);
    } else if (k >= sol.length) finishOk('¡Resuelto!');
  };
  board.onMove(async (mv) => {
    if (done) return;
    const test = new Chess(c.fen());
    const m = test.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
    const expected = new Chess(c.fen()).move(sol[k]);
    if (m.san === expected.san) {
      c.move(m.san); k++;
      board.set({ fen: c.fen(), last: { from: m.from, to: m.to }, arrows: [], marks: [] });
      if (k < sol.length) say(`<p class="ok">¡Bien! Sigue…</p>`);
      autoReply();
      return;
    }
    board.set({ fen: test.fen(), last: { from: m.from, to: m.to }, arrows: [] });
    if (test.isCheckmate()) return finishOk(`¡${san(m.san)} también es mate!`);
    say('<p class="muted">Comprobando con el motor…</p>');
    const eng = ctx.getEngine();
    const [b, a] = await Promise.all([eng.evaluate(c.fen(), { depth: 12, multipv: 1 }), eng.evaluate(test.fen(), { depth: 12, multipv: 1 })]);
    if (!alive) return;
    const loss = winPct(lineCp(b.lines[0])) - (100 - winPct(lineCp(a.lines[0])));
    if (loss <= 2 && winPct(lineCp(b.lines[0])) > 60) return finishOk(`¡${san(m.san)} también gana! La idea de la lección era ${san(sol[k])}.`);
    mistakes++;
    say(`<p><b>${san(m.san)}</b> no es lo mejor. Prueba otra vez.</p>`);
    setTimeout(() => alive && board.set({ fen: c.fen(), last: null }), 800);
  });
  msg.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    const exp = new Chess(c.fen()).move(sol[k]);
    if (a === 'hint') { mistakes++; board.set({ marks: [exp.from] }); say(`<p>${esc(st.puzzle.hint || 'Fíjate en la pieza marcada.')}</p>`); }
    if (a === 'sol') {
      mistakes++;
      board.set({ arrows: arrowsOf([exp.from + exp.to], '#81b64c') });
      say(`<p>La jugada es <b>${san(exp.san)}</b>. Juégala en el tablero para seguir.</p>`);
    }
  });
  return () => { alive = false; board.onMove(null); };
}

function finish(view, l) {
  const all = allLessons().filter((x) => x.type !== 'bio');
  const idx = all.findIndex((x) => x.id === l.id);
  const next = all.slice(idx + 1).find((x) => !lessonDone(x.id)) || all[idx + 1];
  view.innerHTML = `<div class="empty finish"><div class="big-check">✓</div><p>Lección completada</p><p class="muted">${esc(l.title)}</p>
    ${l.drills?.length ? `<a class="btn wide" href="#/aprender/practica/${l.id}/0">Practicar las líneas</a>` : ''}
    ${next ? `<a class="btn ${l.drills?.length ? 'ghost' : ''} wide" href="#/aprender/${next.id}">Siguiente: ${esc(next.title)}</a>` : ''}
    <a class="btn ghost wide" href="#/aprender">Volver a la biblioteca</a></div>`;
}

// ───────── Partidas comentadas ─────────
function gameLesson(view, l, ctx) {
  const c = new Chess();
  const hist = sanList(l.pgn).map((s) => c.move(s));
  const labels = hist.map((m, i) => `${Math.floor(i / 2) + 1}${i % 2 ? '...' : '.'}${m.san}`);
  let ply = -1, timer = null;
  view.innerHTML = `<header class="page-head"><a class="back" href="#/aprender/capitulo/inmortales">‹ Inmortales</a></header>
    <h1 class="lesson-title">${esc(l.title)}</h1>
    <p class="muted small game-meta">${esc(l.white)} – ${esc(l.black)} · ${esc(l.event)}, ${l.year} · ${l.result}</p>
    <div class="board-wrap solo"><div id="board"></div></div>
    <div class="lesson-text" id="gnote"></div>
    <div class="controls"><button class="ctl" data-g="start" aria-label="Inicio">⏮</button><button class="ctl" data-g="prev" aria-label="Anterior">◀</button>
      <button class="ctl" data-g="play" aria-label="Reproducir">⏵</button><button class="ctl" data-g="next" aria-label="Siguiente">▶</button><button class="ctl" data-g="note" aria-label="Siguiente comentario">✎</button></div>
    <div class="movelist" id="gmoves"></div>
    <div class="actions-row"><button class="btn ghost small" id="evalbtn">Evaluar posición con Stockfish</button></div><p class="small muted" id="evalout"></p>`;
  const board = createBoard($('#board'));
  const rows = [];
  for (let i = 0; i < hist.length; i += 2) rows.push([i, i + 1]);
  $('#gmoves').innerHTML = rows.map(([a, b], r) => `<div class="mrow"><span class="mn">${r + 1}.</span>${[a, b].map((j) => hist[j] ? `<button class="mv-btn" data-ply="${j}">${l.notes[labels[j]] ? '<i style="background:var(--brass)"></i>' : ''}${san(hist[j].san)}</button>` : '<span></span>').join('')}</div>`).join('');
  $('#gmoves').addEventListener('click', (e) => { const b = e.target.closest('[data-ply]'); if (b) { stop(); go(+b.dataset.ply); } });
  const stop = () => { clearInterval(timer); timer = null; view.querySelector('[data-g=play]').textContent = '⏵'; };
  view.querySelector('.controls').addEventListener('click', (e) => {
    const k = e.target.closest('[data-g]')?.dataset.g; if (!k) return;
    if (k !== 'play') stop();
    if (k === 'start') go(-1); if (k === 'prev') go(ply - 1); if (k === 'next') go(ply + 1);
    if (k === 'note') { const n = labels.findIndex((lab, j) => j > ply && l.notes[lab]); go(n >= 0 ? n : hist.length - 1); }
    if (k === 'play') {
      if (timer) return stop();
      e.target.textContent = '⏸';
      timer = setInterval(() => { if (ply >= hist.length - 1) { stop(); markLesson(l.id); return; } go(ply + 1); if (l.notes[labels[ply]]) stop(); }, 1300);
    }
  });
  $('#evalbtn').addEventListener('click', async () => {
    const fen = ply >= 0 ? hist[ply].after : new Chess().fen();
    $('#evalout').textContent = 'Calculando…';
    const r = await ctx.getEngine().evaluate(fen, { depth: 16, multipv: 1 });
    const cp = lineCp(r.lines[0]) * (fen.split(' ')[1] === 'w' ? 1 : -1);
    const cc = new Chess(fen); const line = [];
    for (const u of (r.lines[0]?.pv || []).slice(0, 5)) { try { line.push(san(cc.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san)); } catch { break; } }
    $('#evalout').textContent = r.lines[0]?.uci ? `${evalText(cp)} · ${line.join(' ')}` : 'Fin de la partida.';
  });
  function go(p) {
    ply = Math.max(-1, Math.min(hist.length - 1, p));
    const m = hist[ply];
    board.set({ fen: m ? m.after : new Chess().fen(), last: m ? { from: m.from, to: m.to } : null });
    const note = m ? l.notes[labels[ply]] : null;
    $('#gnote').innerHTML = m
      ? `<div class="g-move">${Math.floor(ply / 2) + 1}${ply % 2 ? '…' : '.'} ${san(m.san)}</div>${note ? `<div class="prose">${md(note)}</div>` : '<p class="muted small">Pulsa ✎ para saltar al siguiente comentario.</p>'}`
      : `<div class="prose"><p>${esc(l.summary)}</p><p class="muted small">Pulsa ⏵ para reproducirla; se detiene en cada comentario.</p></div>`;
    $('#evalout').textContent = '';
    $('#gmoves').querySelectorAll('.mv-btn').forEach((b) => b.classList.toggle('cur', +b.dataset.ply === ply));
    $('#gmoves').querySelector('.cur')?.scrollIntoView({ block: 'nearest' });
    if (ply === hist.length - 1) markLesson(l.id);
  }
  ctx.setCleanup?.(() => clearInterval(timer));
  go(-1);
}

// ───────── Práctica de líneas de apertura ─────────
function drill(view, lessonId, idx, ctx) {
  const l = lessonById(lessonId);
  const d = l?.drills?.[idx];
  if (!d) { location.hash = '#/aprender'; return; }
  const line = sanList(d.line);
  const c = new Chess();
  let k = 0, errors = 0, alive = true, misses = 0;
  view.innerHTML = `<header class="page-head"><a class="back" href="#/aprender/${l.id}">‹ ${esc(l.title)}</a></header>
    <h1 class="lesson-title">${esc(d.name)}</h1>
    <p class="muted small">Juegas con ${d.side === 'w' ? 'blancas' : 'negras'} · ${Math.ceil(line.length / 2)} jugadas</p>
    <div class="board-wrap solo"><div id="board"></div></div>
    <div class="lesson-text" id="dmsg"></div>
    <div class="drill-line" id="dline"></div>
    ${l.drills.length > 1 ? `<div class="chips">${l.drills.map((x, j) => `<a class="chip ${j === idx ? 'on' : ''}" href="#/aprender/practica/${l.id}/${j}">${esc(x.name)}</a>`).join('')}</div>` : ''}`;
  const board = createBoard($('#board'));
  const say = (h) => ($('#dmsg').innerHTML = h);
  const renderLine = () => ($('#dline').innerHTML = line.slice(0, k).map((s, j) => `${j % 2 === 0 ? `<b>${j / 2 + 1}.</b>` : ''}${san(s)}`).join(' '));
  board.set({ flipped: d.side === 'b', interactive: true });
  function step() {
    renderLine();
    if (k >= line.length) {
      board.set({ interactive: false });
      markDrill(`${l.id}:${idx}`, errors);
      say(`<p class="ok">${errors ? `Línea terminada con ${errors} fallo(s). Repítela para fijarla.` : '¡Perfecta! Línea completada sin fallos.'}</p>
        <div class="actions-row"><a class="btn" href="#/aprender/practica/${l.id}/${idx}" id="again">Repetir</a><a class="btn ghost" href="#/aprender/${l.id}">Volver a la lección</a></div>`);
      $('#again').addEventListener('click', (e) => { e.preventDefault(); drill(view, lessonId, idx, ctx); });
      return;
    }
    if (c.turn() !== d.side) {
      setTimeout(() => {
        if (!alive) return;
        const m = c.move(line[k++]);
        board.set({ fen: c.fen(), last: { from: m.from, to: m.to }, arrows: [] });
        step();
      }, k === 0 ? 300 : 500);
      say('<p class="muted">El rival mueve…</p>');
    } else { misses = 0; say(`<p>Tu jugada${k > 1 ? ` tras ${san(line[k - 1])}` : ''}.</p>`); }
  }
  board.onMove((mv) => {
    if (k >= line.length || c.turn() !== d.side) return;
    const exp = new Chess(c.fen()).move(line[k]);
    if (mv.from === exp.from && mv.to === exp.to) {
      c.move(line[k++]);
      board.set({ fen: c.fen(), last: { from: exp.from, to: exp.to }, arrows: [] });
      step();
      return;
    }
    errors++; misses++;
    if (misses >= 2) { board.set({ arrows: arrowsOf([exp.from + exp.to], '#81b64c') }); say(`<p>La jugada de la línea es <b>${san(exp.san)}</b>.</p>`); }
    else { board.set({ marks: [exp.from] }); say('<p>No es la jugada de la línea. Pista: mueve la pieza marcada.</p>'); }
  });
  ctx.setCleanup?.(() => { alive = false; });
  step();
}
