// Tablero ligero: piezas SVG, resaltado de la última jugada, flechas y mover tocando casillas
import { Chess } from 'chess.js';
import { CLASSES } from './analysis/analyzer.js';

const FILES = 'abcdefgh';
const PIECES = `${import.meta.env.BASE_URL}pieces/`;

export function createBoard(el, { onMove } = {}) {
  el.classList.add('board');
  el.innerHTML = `<div class="squares"></div><svg class="arrows" viewBox="0 0 8 8"></svg>`;
  const sqEl = el.querySelector('.squares');
  const svg = el.querySelector('.arrows');
  const cells = {};
  let state = { fen: new Chess().fen(), flipped: false, last: null, badge: null, arrows: [], interactive: false };
  let selected = null;

  function build() {
    sqEl.innerHTML = '';
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const file = state.flipped ? 7 - f : f, rank = state.flipped ? r + 1 : 8 - r;
      const sq = FILES[file] + rank;
      const d = document.createElement('div');
      d.className = 'sq ' + ((file + rank) % 2 ? 'light' : 'dark');
      d.dataset.sq = sq;
      if (f === 0) d.insertAdjacentHTML('beforeend', `<span class="coord r">${rank}</span>`);
      if (r === 7) d.insertAdjacentHTML('beforeend', `<span class="coord f">${FILES[file]}</span>`);
      sqEl.appendChild(d);
      cells[sq] = d;
    }
  }
  const xy = (sq) => {
    const f = FILES.indexOf(sq[0]), r = +sq[1];
    return state.flipped ? [7 - f + 0.5, r - 0.5] : [f + 0.5, 8 - r + 0.5];
  };
  function drawArrows() {
    svg.innerHTML = `<defs>${state.arrows.map((a, i) => `<marker id="ah${i}" markerWidth="3" markerHeight="3" refX="1.6" refY="1.5" orient="auto"><path d="M0,0 L3,1.5 L0,3 z" fill="${a.color}"/></marker>`).join('')}</defs>` +
      state.arrows.map((a, i) => {
        const [x1, y1] = xy(a.from), [x2, y2] = xy(a.to);
        const len = Math.hypot(x2 - x1, y2 - y1), k = (len - 0.35) / len;
        return `<line x1="${x1}" y1="${y1}" x2="${x1 + (x2 - x1) * k}" y2="${y1 + (y2 - y1) * k}" stroke="${a.color}" stroke-width="0.17" stroke-linecap="round" opacity="0.85" marker-end="url(#ah${i})"/>`;
      }).join('');
  }
  function render() {
    const c = new Chess(state.fen);
    const board = c.board();
    for (const sq in cells) {
      const d = cells[sq];
      d.classList.remove('last', 'sel', 'target', 'check');
      d.querySelector('img')?.remove();
      d.querySelector('.badge')?.remove();
      d.querySelector('.dot')?.remove();
    }
    for (const row of board) for (const p of row) {
      if (!p) continue;
      const img = document.createElement('img');
      img.src = `${PIECES}${p.color}${p.type.toUpperCase()}.svg`;
      img.alt = ''; img.draggable = false;
      cells[p.square].appendChild(img);
    }
    if (state.last) for (const s of [state.last.from, state.last.to]) cells[s]?.classList.add('last');
    if (c.inCheck()) {
      for (const row of board) for (const p of row) if (p && p.type === 'k' && p.color === c.turn()) cells[p.square].classList.add('check');
    }
    if (state.badge && state.last) {
      const k = CLASSES[state.badge];
      cells[state.last.to].insertAdjacentHTML('beforeend', `<span class="badge" style="background:${k.color}" title="${k.label}">${k.sym}</span>`);
    }
    if (selected) {
      cells[selected]?.classList.add('sel');
      for (const m of c.moves({ square: selected, verbose: true })) {
        cells[m.to].classList.add('target');
        cells[m.to].insertAdjacentHTML('beforeend', `<span class="dot${m.captured ? ' cap' : ''}"></span>`);
      }
    }
    drawArrows();
  }
  sqEl.addEventListener('click', (e) => {
    if (!state.interactive) return;
    const d = e.target.closest('.sq'); if (!d) return;
    const sq = d.dataset.sq;
    const c = new Chess(state.fen);
    const p = c.get(sq);
    if (selected) {
      const legal = c.moves({ square: selected, verbose: true }).find((m) => m.to === sq);
      if (legal) {
        const from = selected; selected = null;
        onMove?.({ from, to: sq, promotion: legal.promotion ? 'q' : undefined, uci: from + sq + (legal.promotion ? 'q' : '') });
        render();
        return;
      }
    }
    selected = p && p.color === c.turn() && sq !== selected ? sq : null;
    render();
  });
  build();
  return {
    set(patch) {
      const rebuild = 'flipped' in patch && patch.flipped !== state.flipped;
      state = { ...state, ...patch };
      if ('fen' in patch) selected = null;
      if (rebuild) build();
      render();
    },
    get state() { return state; },
  };
}
