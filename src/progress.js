// Progreso de entrenamiento: lecciones, prácticas de apertura, repetición espaciada y racha diaria.
// Se guarda en el móvil y, si hay sesión de Supabase, también en la nube.
import { supabase, currentUser } from './store.js';

const KEY = 'entrenador-progreso';
const empty = () => ({ lessons: {}, drills: {}, srs: {}, days: {}, updatedAt: null });
let cache = null;
export function progress() {
  if (cache) return cache;
  try { cache = { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { cache = empty(); }
  // Migra los resueltos de la versión 1
  try {
    const old = JSON.parse(localStorage.getItem('entrenador-resueltos') || 'null');
    if (old) { for (const k of Object.keys(old)) cache.srs[k] ||= { box: 1, due: Date.now() + 86400e3, seen: 1 }; localStorage.removeItem('entrenador-resueltos'); save(); }
  } catch {}
  return cache;
}
let pushTimer = null;
function save() {
  cache.updatedAt = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushProgress, 2000);
}
const today = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD en hora local
export function logActivity(kind, n = 1) {
  const p = progress();
  const d = (p.days[today()] ||= {});
  d[kind] = (d[kind] || 0) + n;
  save();
}
export const todayLog = () => progress().days[today()] || {};
export function streak() {
  const days = progress().days;
  let n = 0;
  const d = new Date();
  if (!days[d.toLocaleDateString('sv-SE')]) d.setDate(d.getDate() - 1); // la racha sigue viva si hoy aún no has entrenado
  while (days[d.toLocaleDateString('sv-SE')]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function lastDays(n = 14) {
  const out = [], days = progress().days, d = new Date();
  for (let i = 0; i < n; i++) {
    const k = d.toLocaleDateString('sv-SE');
    const v = days[k] || {};
    out.unshift({ day: k, total: Object.values(v).reduce((a, b) => a + b, 0) });
    d.setDate(d.getDate() - 1);
  }
  return out;
}

export function markLesson(id) { const p = progress(); if (!p.lessons[id]) { p.lessons[id] = Date.now(); logActivity('lessons'); } else save(); }
export const lessonDone = (id) => !!progress().lessons[id];
export function markDrill(key, errors) {
  const p = progress();
  const d = (p.drills[key] ||= { n: 0, perfect: 0 });
  d.n++; if (!errors) d.perfect++;
  logActivity('drills');
}

// Repetición espaciada (sistema de Leitner): acierto a la primera → la posición vuelve más tarde
const BOX_DAYS = [0, 1, 3, 7, 16, 35];
export function srsResult(key, firstTry) {
  const p = progress();
  const s = (p.srs[key] ||= { box: 0, due: 0, seen: 0 });
  s.seen++;
  s.box = firstTry ? Math.min(BOX_DAYS.length - 1, s.box + 1) : 0;
  s.due = Date.now() + (firstTry ? BOX_DAYS[s.box] : 1) * 86400e3;
  logActivity('puzzles');
}
// Ordena posiciones: primero las que tocan hoy, luego las nuevas
export function dueList(puzzles) {
  const now = Date.now(), srs = progress().srs;
  const key = (x) => `${x.gameId}:${x.ply}`;
  const due = puzzles.filter((x) => srs[key(x)] && srs[key(x)].due <= now);
  const fresh = puzzles.filter((x) => !srs[key(x)]);
  return { due, fresh, queue: [...due, ...fresh], mastered: puzzles.filter((x) => (srs[key(x)]?.box || 0) >= 3).length };
}

// ---------- Nube ----------
async function pushProgress() {
  try {
    const sb = supabase(); const u = await currentUser();
    if (!sb || !u) return;
    await sb.from('progress').upsert({ user_id: u.id, data: cache, updated_at: cache.updatedAt });
  } catch {}
}
export async function pullProgress() {
  try {
    const sb = supabase(); const u = await currentUser();
    if (!sb || !u) return;
    const { data, error } = await sb.from('progress').select('data').eq('user_id', u.id).maybeSingle();
    if (error || !data?.data) return pushProgress();
    const r = data.data, p = progress();
    for (const k of ['lessons', 'drills', 'srs']) p[k] = { ...r[k], ...p[k] };
    for (const [d, v] of Object.entries(r.days || {})) {
      const l = (p.days[d] ||= {});
      for (const [kind, n] of Object.entries(v)) l[kind] = Math.max(l[kind] || 0, n);
    }
    save();
  } catch {}
}
export function exportProgress() { return progress(); }
export function importProgress(data) { if (data) { cache = { ...empty(), ...data }; save(); } }
