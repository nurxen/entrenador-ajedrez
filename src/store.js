// Almacenamiento: IndexedDB en el móvil (funciona sin conexión) + sincronización opcional con Supabase
import { createClient } from '@supabase/supabase-js';

const DB = 'entrenador-ajedrez', STORE = 'games';
let dbP;
function db() {
  dbP ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbP;
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out?.result ?? out);
    t.onerror = () => rej(t.error);
  });
}
export const localGames = {
  all: () => tx('readonly', (s) => s.getAll()),
  get: (id) => tx('readonly', (s) => s.get(id)),
  put: (g) => tx('readwrite', (s) => s.put(g)),
  del: (id) => tx('readwrite', (s) => s.delete(id)),
  clear: () => tx('readwrite', (s) => s.clear()),
};

// ---------- Ajustes ----------
const SETTINGS_KEY = 'entrenador-ajustes';
const defaults = {
  username: '', depth: 14, timeClass: 'rapid', autoImport: true,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};
export function getSettings() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return { ...defaults }; }
}
export function saveSettings(patch) {
  const s = { ...getSettings(), ...patch };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
  if ('supabaseUrl' in patch || 'supabaseKey' in patch) client = null;
  return s;
}

// ---------- Supabase ----------
let client = null;
export function supabase() {
  const s = getSettings();
  if (!s.supabaseUrl || !s.supabaseKey) return null;
  client ||= createClient(s.supabaseUrl, s.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}
export async function currentUser() {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user || null;
}
const toRow = (g, uid) => ({
  user_id: uid, id: g.id, source: g.source, url: g.url || null, pgn: g.pgn, played_at: g.playedAt || null,
  white: g.white, black: g.black, result: g.result, time_class: g.timeClass || null,
  my_color: g.myColor || null, accuracy: g.myAccuracy ?? null, opening: g.analysis?.opening?.name || null,
  analysis: g.analysis || null, updated_at: g.updatedAt,
});
const fromRow = (r) => ({
  id: r.id, source: r.source, url: r.url, pgn: r.pgn, playedAt: r.played_at, white: r.white, black: r.black,
  result: r.result, timeClass: r.time_class, myColor: r.my_color, myAccuracy: r.accuracy, analysis: r.analysis, updatedAt: r.updated_at,
});
export async function pushGame(g) {
  const sb = supabase(); const u = await currentUser();
  if (!sb || !u) return false;
  const { error } = await sb.from('games').upsert(toRow(g, u.id));
  if (error) throw error;
  return true;
}
export async function sync() {
  const sb = supabase(); const u = await currentUser();
  if (!sb || !u) return { skipped: true };
  const { data, error } = await sb.from('games').select('*');
  if (error) throw error;
  const remote = new Map(data.map((r) => [r.id, fromRow(r)]));
  const local = await localGames.all();
  let down = 0, up = 0;
  const toPush = [];
  for (const g of local) {
    const r = remote.get(g.id);
    if (!r || (g.updatedAt || '') > (r.updatedAt || '')) toPush.push(toRow(g, u.id));
  }
  for (const [id, r] of remote) {
    const l = local.find((x) => x.id === id);
    if (!l || (r.updatedAt || '') > (l.updatedAt || '')) { await localGames.put(r); down++; }
  }
  for (let i = 0; i < toPush.length; i += 20) {
    const { error: e } = await sb.from('games').upsert(toPush.slice(i, i + 20));
    if (e) throw e;
    up += Math.min(20, toPush.length - i);
  }
  return { down, up };
}
export async function deleteRemote(id) {
  const sb = supabase(); const u = await currentUser();
  if (sb && u) await sb.from('games').delete().eq('id', id);
}
