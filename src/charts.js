// Gráficos SVG sencillos y sin dependencias
import { CLASSES } from './analysis/analyzer.js';

// Gráfica de ventaja: zona clara = blancas, oscura = negras. Marca errores y brillantes.
export function evalGraph(whiteWin, moves, current) {
  const n = whiteWin.length - 1 || 1;
  const W = 300, H = 64;
  const x = (i) => (i / n) * W, y = (w) => H - (w / 100) * H;
  const pts = whiteWin.map((w, i) => `${x(i).toFixed(1)},${y(w).toFixed(1)}`).join(' ');
  const marks = moves
    .filter((m) => ['blunder', 'mistake', 'miss', 'brilliant', 'great'].includes(m.cls))
    .map((m) => `<circle cx="${x(m.ply + 1)}" cy="${y(whiteWin[m.ply + 1])}" r="3.2" fill="${CLASSES[m.cls].color}" stroke="var(--bg)" stroke-width="1"/>`).join('');
  const cur = current >= 0 ? `<line x1="${x(current + 1)}" x2="${x(current + 1)}" y1="0" y2="${H}" stroke="var(--brass)" stroke-width="1.5"/>` : '';
  return `<svg class="evalgraph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Gráfica de ventaja">
    <rect width="${W}" height="${H}" fill="var(--g-black)"/>
    <polygon points="0,${H} ${pts} ${W},${H}" fill="var(--g-white)"/>
    <line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="var(--muted)" stroke-width="0.5" stroke-dasharray="3 3"/>
    ${cur}${marks}</svg>`;
}

// Línea de precisión por partida (más reciente a la derecha)
export function trendChart(points, { key = 'acc', min = 40, max = 100, label = '%' } = {}) {
  if (points.length < 2) return '<p class="muted small">Analiza al menos 2 partidas para ver la evolución.</p>';
  const W = 320, H = 120, P = 24;
  const lo = Math.min(min, ...points.map((p) => p[key])), hi = Math.max(max, ...points.map((p) => p[key]));
  const x = (i) => P + (i / (points.length - 1)) * (W - P - 8);
  const y = (v) => 8 + (1 - (v - lo) / (hi - lo || 1)) * (H - 28);
  const line = points.map((p, i) => `${x(i)},${y(p[key])}`).join(' ');
  // media móvil de 5
  const ma = points.map((_, i) => {
    const s = points.slice(Math.max(0, i - 4), i + 1);
    return `${x(i)},${y(s.reduce((a, b) => a + b[key], 0) / s.length)}`;
  }).join(' ');
  const resColor = { win: 'var(--win)', loss: 'var(--loss)', draw: 'var(--muted)' };
  const ticks = [lo, (lo + hi) / 2, hi].map((v) => `<text x="2" y="${y(v) + 3}" class="tick">${Math.round(v)}</text><line x1="${P}" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="grid"/>`).join('');
  const dots = points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p[key])}" r="3" fill="${resColor[p.res] || 'var(--ink)'}"/>`).join('');
  return `<svg class="trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de ${label}">${ticks}
    <polyline points="${line}" fill="none" stroke="var(--muted)" stroke-width="1"/>
    <polyline points="${ma}" fill="none" stroke="var(--brass)" stroke-width="2.2" stroke-linejoin="round"/>${dots}</svg>`;
}

export function bars(items, { max, fmt = (v) => v } = {}) {
  const m = max ?? Math.max(1, ...items.map((i) => i.value));
  return `<div class="bars">${items.map((i) => `
    <div class="bar-row"><span class="bar-label">${i.label}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${Math.max(2, (i.value / m) * 100)}%;background:${i.color || 'var(--brass)'}"></span></span>
      <span class="bar-val">${fmt(i.value)}</span></div>`).join('')}</div>`;
}

// Segundos gastados en cada jugada propia; los errores se pintan con su color
export function timeChart(moves) {
  if (!moves?.length) return '';
  const W = 320, H = 90, max = Math.max(10, ...moves.map((m) => m.spent));
  const bw = W / moves.length;
  const bad = { mistake: CLASSES.mistake.color, blunder: CLASSES.blunder.color, miss: CLASSES.miss.color, inaccuracy: CLASSES.inaccuracy.color };
  return `<svg class="timechart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Tiempo por jugada">
    ${moves.map((m, i) => { const h = Math.max(1.5, (m.spent / max) * (H - 4)); return `<rect x="${(i * bw + bw * 0.12).toFixed(2)}" y="${(H - h).toFixed(2)}" width="${(bw * 0.76).toFixed(2)}" height="${h.toFixed(2)}" rx="1" fill="${bad[m.cls] || 'var(--muted)'}"><title>${Math.floor(m.ply / 2) + 1}. ${m.san}: ${Math.round(m.spent)} s</title></rect>`; }).join('')}
  </svg><div class="tc-axis"><span>jugada 1</span><span>máx. ${Math.round(max)} s</span><span>jugada ${Math.floor(moves.at(-1).ply / 2) + 1}</span></div>`;
}

// Actividad de los últimos días (racha)
export function activityDots(days) {
  return `<div class="dots">${days.map((d) => `<span class="dot-day ${d.total ? (d.total >= 8 ? 'l3' : d.total >= 3 ? 'l2' : 'l1') : ''}" title="${d.day}: ${d.total}"></span>`).join('')}</div>`;
}
