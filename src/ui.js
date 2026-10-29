// Utilidades de interfaz compartidas
import { CLASSES } from './analysis/analyzer.js';
import { getSettings } from './store.js';

export const $ = (s, r = document) => r.querySelector(s);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '');
export const pct = (v) => (v == null ? '–' : `${Math.round(v)}`);
export const badge = (cls, size = '') => `<span class="cbadge ${size}" style="background:${CLASSES[cls].color}" title="${CLASSES[cls].label}">${CLASSES[cls].sym}</span>`;

export function toast(msg, ms = 3500) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), ms);
}

// Notación: el motor usa la inglesa (N, B, R, Q, K); por defecto se muestra en español (C, A, T, D, R)
const ES = { K: 'R', Q: 'D', R: 'T', B: 'A', N: 'C' };
const useEs = () => getSettings().notation !== 'en';
export function san(s) {
  if (!s || !useEs()) return s || '';
  return s.replace(/^[KQRBN]/, (p) => ES[p]).replace(/=([QRBN])/, (_, p) => '=' + ES[p]);
}
// Convierte las jugadas que aparecen dentro de un texto generado por el analizador
export function sanText(text) {
  if (!text || !useEs()) return text || '';
  return text.replace(/\b([KQRBN])([a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)/g, (_, p, rest) => ES[p] + rest.replace(/=([QRBN])/, (__, q) => '=' + ES[q]));
}

// Markdown mínimo para las lecciones: **negrita**, *cursiva*, párrafos y listas
export function md(text) {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
  return String(text || '').split(/\n\n+/).map((block) => {
    const lines = block.split('\n');
    if (lines.every((l) => /^- /.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
    if (lines.every((l) => /^\d+\. /.test(l))) return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`;
    if (lines.length > 1 && lines.slice(1).every((l) => /^(- |\d+\. )/.test(l))) {
      const ordered = /^\d/.test(lines[1]);
      return `<p>${inline(lines[0])}</p><${ordered ? 'ol' : 'ul'}>${lines.slice(1).map((l) => `<li>${inline(l.replace(/^(- |\d+\. )/, ''))}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`;
    }
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('');
}

export const sanList = (line) => String(line || '').replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/).filter(Boolean);
export const moveLabel = (ply, s) => `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? '.' : '…'} ${san(s)}`;
export function evalText(cpWhite) {
  if (cpWhite == null) return '';
  if (Math.abs(cpWhite) >= 9000) { const m = 10000 - Math.abs(cpWhite); return m ? `M${m}` : '#'; }
  return (cpWhite > 0 ? '+' : '') + (cpWhite / 100).toFixed(1);
}
